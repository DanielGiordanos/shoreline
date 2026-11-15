/* PVX-N364 - HIG Token fields (Add patient's Reason for visit). Source changes in n364/patch_n364.py:
   1. a token's ✕ is the Close symbol (it was a typed "×"); its tooltip says what was typed when the problem was matched to a name;
   2. problems can be put in order: Move earlier / Move later in the token's menu, and ⌥← ⌥→ on a selected token
      (the first problem leads the reason everywhere and is recorded as the visit's main reason);
   3. the token's menu has commands only, Remove last in red after a separator (the "Typed: …" row did nothing).
   Activity rings: Move, Exercise and Stand only; Flow shows no fitness data and no ring that could be mistaken for them. */