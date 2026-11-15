/* PVX-N361 - HIG Path controls + Search fields. Source changes in n361/patch_n361.py:
   1. Flow's search shows the longest whole placeholder that fits ("Search patients, doctors, rooms" on a wide Mac window),
      never one cut mid-word; the field is wider where the window has room;
   2. every search field has a Clear button (pop-ups, Add flag), and Esc in Add flag clears what's typed before closing;
   3. names aren't autocorrected or underlined in Flow's search or the pop-ups' search;
   4. a pop-up choice shows its whole name and load, wrapping when long, instead of ending in "…";
   5. Esc in a pop-up or in Add flag closes only that, not the drawer behind it.
   Path controls are a Mac file-system control; Flow has no files or folders to show a path for. */