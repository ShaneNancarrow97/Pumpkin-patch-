# Interrupted normal-render standard smoke

This is an intentionally interrupted **partial run**, not a pass and not a product failure. It reached ten passing desktop checks with no FAIL assertions. Software WebGL then made ordinary menu actions too slow for a useful regression run. The parent requested the explicit `SMOKE_HOLD_DRAWS=1` QA profile; the owned process was stopped, which produced the target-closed stack in the preserved log.

The completed standard regression, once run, belongs in `../standard-smoke/`. Independent normal-render photographs and shader checks are in the full and CSS-delta evidence directories.
