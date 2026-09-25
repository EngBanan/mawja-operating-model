# Copyright (c) 2026 Banan Abu Zahar. SPDX-License-Identifier: MIT
import json
import os
from pathlib import Path

from app.calc import add

inputs = [
    ("zero", 0, 0, 0),
    ("positive", 2, 3, 5),
    ("mixed-sign", -2, 3, 1),
    ("negative", -2, -3, -5),
]
cases = [
    {"id": name, "status": "passed" if add(a, b) == expected else "failed"}
    for name, a, b, expected in inputs
]
Path(os.environ["MAWJA_CHECK_REPORT"]).write_text(json.dumps({
    "version": 1, "token": os.environ["MAWJA_CHECK_TOKEN"], "cases": cases,
}), encoding="utf-8")
print(json.dumps(cases))
raise SystemExit(0 if all(case["status"] == "passed" for case in cases) else 1)
