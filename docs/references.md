# References

Primary documentation and research related to Mawja's workflow. These sources describe related practices and tools; they do not establish Mawja as an industry standard or certify compatibility.

## Related projects

| Project | Focus |
|---|---|
| [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) | Agent workflows for software planning and implementation |
| [GitHub Spec Kit](https://github.com/github/spec-kit) | Specification-led development with planning, task and implementation workflows |
| [Kiro specs](https://kiro.dev/docs/specs/) | Structured requirements, design and implementation tasks |
| [SpecShip](https://github.com/aws-samples/sample-specship) | A Kiro workflow covering planning, implementation, validation and delivery |
| [Open SWE](https://github.com/langchain-ai/open-swe) | An open-source coding agent with a LangGraph runtime and separate review capabilities |

Consult each project's documentation for its current requirements and supported integrations.

## Engineering concepts

| Topic | Source and scope |
|---|---|
| Test design | [ASTQB: Test techniques overview](https://astqb.org/4-1-test-techniques-overview/) distinguishes behavior-based black-box techniques from structure-based white-box techniques |
| Test levels and regression | [ASTQB: Test levels and test types](https://astqb.org/2-2-test-levels-and-test-types/) explains acceptance testing and checking for unintended effects after changes |
| Acceptance testing | [ISTQB: Acceptance Testing](https://istqb.org/certifications/certified-tester-acceptance-testing/) covers acceptance criteria, user needs and collaboration among product, business and testing roles |
| Mutation testing | [Stryker: What is mutation testing?](https://stryker-mutator.io/docs/) explains changing source code to evaluate whether tests detect the change |
| Vacuity analysis | Kupferman and Vardi, [Vacuity Detection in Temporal Model Checking](https://cris.huji.ac.il/en/publications/vacuity-detection-in-temporal-model-checking-13/), examines specifications whose parts do not affect satisfaction; Mawja's minimum scan counts are a narrower safeguard |
| Quality gates | [SonarQube: Introduction to quality gates](https://docs.sonarsource.com/sonarqube-server/quality-standards-administration/managing-quality-gates/introduction-to-quality-gates) describes acceptance conditions evaluated against analysis results |
| Technical debt | Ward Cunningham, [The WyCash Portfolio Management System](https://c2.com/doc/oopsla92.html), describes the ongoing cost of postponing code consolidation |
| Ratcheting | [Betterer: Introduction](https://phenomnomnominal.github.io/betterer/docs/introduction/) describes enforcing incremental improvement and rejecting regressions |
| Baselines | [Betterer: Recorded results](https://phenomnomnominal.github.io/betterer/docs/introduction/#how-does-betterer-work) illustrates saving test results for comparison with later runs |
| Required checks | [GitHub: Protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) describes status-check requirements for merging |

See [engineering foundations](11-what-this-framework-is-built-on.md) for how Mawja applies these concepts.

---

# About the author

**Banan Abu Zahar** · Software engineer · Riyadh, Saudi Arabia

Over eighteen years of experience in business systems and digital transformation, including ERP, IT management, business analysis and systems analysis. Background in software engineering and product management, with study in data science and business analytics.

Works on software development and product delivery, with hands-on experience applying AI.

[linkedin.com/in/eng-banan](https://linkedin.com/in/eng-banan)

**To cite**: Abu Zahar, Banan. *"Mawja: An Engineering Operating Model."* First edition, 2026.

**Adoption**: start with the practices needed by your project.

---

[Previous: Appendix: technical contracts](appendix.md) · [Documentation index](README.md)
