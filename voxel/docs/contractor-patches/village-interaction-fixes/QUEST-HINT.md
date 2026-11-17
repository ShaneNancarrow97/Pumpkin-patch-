# Quest tracker button symbol

The top-left followed-quest graphic now uses the shared crisp D-pad Up drawing from `dualsense-icons.js` instead of the literal “D-pad ↑” line. It is the same standard Up button used by the existing controller mapping, so it also suits a generically mapped pad.

The existing village `data-input` attribute chooses the hint without another event listener: controller mode shows the Up symbol, keyboard mode shows a `T` keycap, and touch keeps the expand chevron. Decorating hides shortcut hints because the build controls own those inputs. The decorative glyph sits outside the rotating chevron span, so expanding the checklist cannot turn the Up symbol upside down.

`trackerToggleHintMarkup()` is a pure presentation export. The only village-game integration changes are its named import and the existing shell markup call. `aria-expanded`, the toggle's accessible label/title, keyboard `T`, controller button12 and the actual expansion handler are unchanged. The graphic remains inside the existing full-width touch button, whose height stays above44px; it is not another tiny interactive target.

All three focused tracker tests pass, including the existing real-quest progress and safe-text checks. Syntax and whitespace checks pass. Browser layout and controller verification belong to the parent final-delta run.
