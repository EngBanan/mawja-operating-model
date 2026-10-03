# Maintaining Mawja

Use a bounded branch and preserve the published history. Keep public documentation focused on the framework's behavior, requirements and limits. Private project evidence and communication preferences do not become universal requirements automatically.

## Version and validation

[VERSION](../VERSION) is the single source version for the framework, kit and tools. Maintain one [change history](CHANGELOG.md), and match a published tag to that version. Example package versions describe the demonstration applications, not the Mawja release.

Run relevant [toolkit tests](../tests/README.md), [integration validation](../scripts/VALIDATION.md), link checks and visual inspection of affected diagrams. Review an actual generated prompt as well as the generator source. Record platform and untested behavior. Complete independent review for every change. For code or executable-behavior changes, run the full suite on the final integrated revision before publication. Documentation-only changes follow documentation and consistency checks. Validate the kit's displayed version against `VERSION` with the tool-contract suite.

Do not claim a procedure is implemented by a tool merely because it appears in documentation. New enforcement requires code, failure evidence and restoration. Publication follows the Owner's authorization.

## Attribution

Mawja commits record authorship through Git author metadata and do not add `Co-Authored-By` trailers. This repository policy does not alter attribution requirements in adopting projects or their instruction files.
