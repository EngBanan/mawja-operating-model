"""Behavioral tests for the Python baseline checker.

Run with the example's pinned mypy installed:
    python -B -m unittest discover -s tests -v

Coverage: real mypy diagnostics, syntax and snapshot refusal, per-file budgets,
configuration/input failures, and complete-output validation. Parser-only cases
use a controlled subprocess; all language cases run the installed mypy.
MAWJA_PYTHON_CHECKER may select an isolated checker copy for mutation testing.
"""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

SOURCE = Path(os.environ.get("MAWJA_PYTHON_CHECKER",
                            str(Path(__file__).resolve().parents[1] / "scripts/check-python-baseline.py")))


class PythonBaselineTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="mawja-python-test-")
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.script = self.root / "scripts/conductor/check-python-baseline.py"
        self.snapshot = self.root / "scripts/conductor/types-baseline.json"
        self.write("app/__init__.py", "")
        self.write("app/calc.py", "def add(a: int, b: int) -> int:\n    return a + b\n")
        self.write("scripts/governance/check_add.py",
                   "from app.calc import add\nif add(2, 3) != 5:\n    raise AssertionError('addition')\n")
        self.write("tests/test_calc.py", "from app.calc import add\nvalue: int = add(1, 2)\n")
        self.write("mypy.ini", "[mypy]\nstrict = True\nnamespace_packages = True\nexplicit_package_bases = True\n")
        self.script.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(SOURCE, self.script)
        subprocess.run(["git", "init", "-q"], cwd=self.root, check=True, capture_output=True)

    def write(self, name, text):
        p = self.root / name
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text)
        return p

    def run_checker(self, *args, exit=0, optimized=False, cwd=None):
        result = subprocess.run(
            [sys.executable, *(["-O"] if optimized else []), "-B", str(self.script), *args],
            cwd=cwd or self.root, text=True, capture_output=True, timeout=120)
        self.assertEqual(result.returncode, exit, result.stdout + result.stderr)
        return result.stdout

    def measure(self, **kwargs):
        return json.loads(self.run_checker("--json", **kwargs))

    def baseline(self):
        self.run_checker("--init")
        return self.snapshot.read_bytes()

    def assert_refuses_snapshot(self):
        original = self.snapshot.read_bytes()
        result = self.measure(exit=1)
        self.assertEqual(result["kind"], "crash-class")
        self.assertGreater(result["crashHits"], 0)
        self.assertIn("refusing snapshot", self.run_checker("--update", exit=2))
        self.assertEqual(self.snapshot.read_bytes(), original)
        self.snapshot.unlink()
        self.assertIn("refusing snapshot", self.run_checker("--init", exit=2))
        self.assertFalse(self.snapshot.exists())

    def test_clean_and_owning_root(self):
        self.baseline()
        result = self.measure(cwd=self.root.parent)
        self.assertTrue(result["ok"])
        self.assertEqual((result["count"], result["baseline"], result["crashHits"]), (0, 0, 0))
        self.assertEqual(result["configurationFiles"], [str(self.root / "mypy.ini")])
        self.assertIn("tests/test_calc.py", result["checkedFiles"])

    def test_type_regression(self):
        self.baseline()
        self.write("app/calc.py", 'def add(a: int, b: int) -> int:\n    return a + b\nvalue: int = "wrong"\n')
        result = self.measure(exit=1)
        self.assertEqual(result["kind"], "file-ratchet")
        self.assertEqual(result["crashHits"], 0)

    def test_per_file_ratchet(self):
        self.write("app/old.py", 'value: int = "wrong"\n')
        self.baseline()
        self.write("app/old.py", "value: int = 1\n")
        self.write("app/new.py", 'value: int = "wrong"\n')
        result = self.measure(exit=1)
        self.assertEqual(result["count"], result["baseline"])
        self.assertEqual(result["kind"], "file-ratchet")
        before = self.snapshot.read_bytes()
        self.assertIn("file budget", self.run_checker("--update", exit=2))
        self.assertEqual(self.snapshot.read_bytes(), before)

    def test_lowering_and_reinitialization(self):
        self.write("app/debt.py", 'value: int = "wrong"\n')
        before = self.baseline()
        self.assertIn("snapshot already exists", self.run_checker("--init", exit=2))
        self.assertEqual(self.snapshot.read_bytes(), before)
        self.write("app/debt.py", "value: int = 1\n")
        self.run_checker("--update")
        self.assertEqual(self.measure()["baseline"], 0)

    def test_syntax_never_enters_snapshot(self):
        self.baseline()
        self.write("app/broken.py", "def broken(:\n")
        self.assert_refuses_snapshot()

    def test_missing_import_module_never_enters_snapshot(self):
        self.baseline()
        self.write("app/broken.py", "import nonexistent_mawja_test_module\n")
        self.assert_refuses_snapshot()

    def test_missing_import_symbols(self):
        self.baseline()
        for source in [
            "from app.calc import missing_function\n",
            "from app.calc import missing_function as renamed\n",
            "from app.calc import (\n    missing_function,\n)\n",
            "from .calc import missing_function\n",
        ]:
            with self.subTest(source=source):
                self.write("app/broken.py", source)
                self.assert_refuses_snapshot()
                (self.root / "app/broken.py").unlink()
                self.baseline()

    def test_self_import_missing_symbol_never_enters_snapshot(self):
        self.baseline()
        path = self.root / "app/calc.py"
        path.write_text(path.read_text() + "\nfrom app.calc import missing_function\n")
        self.assert_refuses_snapshot()

    def test_implicit_reexport_is_a_rejected_import(self):
        self.baseline()
        self.write("app/reexport.py", "from app.calc import add\n")
        self.write("app/consumer.py", "from app.reexport import add\n")
        self.assert_refuses_snapshot()

    def test_other_attribute_errors_can_be_budgeted(self):
        self.write("app/debt.py", "import app.calc\nvalue = app.calc.missing_attribute\n")
        self.baseline()
        result = self.measure()
        self.assertGreater(result["count"], 0)
        self.assertEqual(result["crashHits"], 0)

    def test_undefined_name_never_enters_snapshot(self):
        self.baseline()
        self.write("app/broken.py", "value = not_defined_here\n")
        self.assert_refuses_snapshot()

    def test_malformed_snapshot_in_optimized_python(self):
        self.baseline()
        for invalid in [
            {"ceiling": True, "files": {}},
            {"ceiling": -1, "files": {}},
            {"ceiling": 0, "files": {"app/calc.py": True}},
            {"ceiling": 0, "files": []},
            [],
        ]:
            with self.subTest(snapshot=invalid):
                self.snapshot.write_text(json.dumps(invalid))
                self.assertEqual(self.measure(exit=2, optimized=True)["kind"], "config")

    def test_missing_config_and_empty_inputs(self):
        self.baseline()
        config = (self.root / "mypy.ini").read_text()
        (self.root / "mypy.ini").unlink()
        self.assertIn("missing mypy config", self.run_checker(exit=2))
        self.write("mypy.ini", config)
        (self.root / "tests/test_calc.py").unlink()
        self.assertIn("no Python inputs", self.run_checker(exit=2))
        (self.root / "tests").rmdir()
        self.assertIn("missing source directory", self.run_checker(exit=2))

    def test_external_symlink_is_refused(self):
        self.baseline()
        with tempfile.TemporaryDirectory(prefix="mawja-external-") as outside:
            target = Path(outside) / "external.py"
            target.write_text("value: int = 1\n")
            (self.root / "app/external.py").symlink_to(target)
            self.assertIn("outside the repository", self.run_checker(exit=2))

    def test_argument_errors(self):
        self.run_checker("--init", "--update", exit=2)
        self.run_checker("--unknown", exit=2)

    def test_incomplete_or_inconsistent_output(self):
        self.baseline()
        source = self.script.read_text()
        cases = [
            ("", 0, ""),
            ("Success: no issues found in 1 source file\n", 0, ""),
            ("Success: no issues found in 4 source files\n" * 2, 0, ""),
            ("Success: no issues found in 4 source files\n", 1, ""),
            ("Found 1 error in 1 file (checked 4 source files)\n", 1, ""),
            ("app/calc.py:1:1: error: wrong  [assignment]\n", 1, ""),
            ("Success: no issues found in 4 source files\n", 2, ""),
            ("Success: no issues found in 4 source files\n", 0, "checker warning"),
        ]
        for stdout, code, stderr in cases:
            with self.subTest(stdout=stdout, code=code, stderr=stderr):
                fake = self.write("fake_checker.py",
                                  f"import sys\nsys.stdout.write({stdout!r})\nsys.stderr.write({stderr!r})\nsys.exit({code})\n")
                self.script.write_text(source.replace(
                    "MYPY = [sys.executable, '-B', '-m', 'mypy']",
                    f"MYPY = [sys.executable, '-B', {str(fake)!r}]"))
                self.assertEqual(self.measure(exit=2)["kind"], "config")


if __name__ == "__main__":
    unittest.main()
