# Flow: where the code is

Written by `_ci/build_flow.py`. Do not edit; it is rewritten on every build.

Each piece is `feature.piece.js` in this folder. `order.json` lists them in the order they run.

## Pieces by feature

| Feature | Pieces | Size |
| --- | ---: | ---: |
| `add-patient` | 11 | 136 KB |
| `alerts` | 2 | 19 KB |
| `app` | 3 | 11 KB |
| `backend` | 7 | 66 KB |
| `board` | 2 | 11 KB |
| `care-team` | 3 | 33 KB |
| `client-display` | 1 | 14 KB |
| `command` | 5 | 33 KB |
| `core` | 3 | 11 KB |
| `critical` | 1 | 20 KB |
| `disposition` | 4 | 54 KB |
| `drawer` | 6 | 31 KB |
| `flags` | 1 | 19 KB |
| `forms` | 2 | 103 KB |
| `hig` | 64 | 192 KB |
| `incoming` | 1 | 43 KB |
| `intake` | 4 | 29 KB |
| `lobby` | 1 | 2 KB |
| `messages` | 1 | 6 KB |
| `model` | 6 | 25 KB |
| `or-link` | 1 | 20 KB |
| `patients` | 4 | 14 KB |
| `rooms` | 3 | 13 KB |
| `rounds-link` | 5 | 68 KB |
| `search` | 1 | 7 KB |
| `shell` | 15 | 30 KB |
| `shifts` | 1 | 3 KB |
| `tracker` | 1 | 4 KB |
| `treatment-link` | 4 | 49 KB |
| `triage` | 1 | 8 KB |
| `ui` | 9 | 71 KB |
| `ultrasound` | 3 | 22 KB |
| `voice` | 1 | 52 KB |
| `yakuri-link` | 1 | 3 KB |

### add-patient

| Piece | Built into | Size | What is in it |
| --- | --- | ---: | --- |
| `add-patient.state.js` | app.js, piece 46 | 0.5 KB | AP_LOCATIONS, apArrivalType, apDoctorDD, BREED_PINS, bcResults, bcPanel, bcInput |
| `add-patient.duplicates.js` | app.js, piece 47 | 2.4 KB | fxClean, fxCleanPatient, fxKey, fxDigits, fxDupFind, fxDupAsk, fxCommitChecked |
| `add-patient.breeds.js` | app.js, piece 50 | 6.3 KB | breedSpecies, breedSource, _bnorm, _buildBreedIndex, breedMeta, felineBreedMeta, breedFuzzyIndexed … and 11 more |
| `add-patient.fields.js` | app.js, piece 51 | 6.0 KB | apAvailableLocations, apMountDoctor, apMountLocation, apSetArrival, apSetPrio, fmtTitleCase, fmtPhoneLive … and 12 more |
| `add-patient.reason-data.js` | app.js, piece 52 | 25.9 KB | REASON_VISIT_DATA |
| `add-patient.reason.js` | app.js, piece 53 | 19.7 KB | rank3, score, highlight, search, attach, close, render … and 26 more |
| `add-patient.problems.js` | app.js, piece 54 | 6.1 KB | focusReasonInput, renderProblemChips, rpSay, rpRemove, rpEdit, rpMove, rpSaySel … and 2 more |
| `add-patient.add-patient.js` | app.js, piece 55 | 5.6 KB | openAddPatient, closeAddPatient, commitPatient, createPatient, intakeTimeAgo |
| `add-patient.hospitals-data.js` | app.js, piece 58 | 56.3 KB | CT_VET_HOSPITALS |
| `add-patient.hospitals.js` | app.js, piece 59 | 5.3 KB | hlText, shortAddr, score, search, attach, close, marks … and 4 more |
| `add-patient.sex.js` | app.js, piece 60 | 2.3 KB | sxCompute, sxHls, sxRefresh, sxSelect, sxClose, sxKey |

### alerts

| Piece | Built into | Size | What is in it |
| --- | --- | ---: | --- |
| `alerts.hospital-alert.js` | app.js, piece 62 | 13.6 KB | _alertColorClass, _heroColorClass, fmtAlertWhen, toLocalInput, _clStopFallback, _clMarqueeMeasure, _clMarqueeFallback … and 10 more |
| `alerts.luna-alert.js` | layers.js, piece 4 | 5.7 KB |  |

### app

| Piece | Built into | Size | What is in it |
| --- | --- | ---: | --- |
| `app.wiring.js` | app.js, piece 68 | 7.0 KB | attachCaret, updCaret, normalize |
| `app.boot.js` | app.js, piece 74 | 2.0 KB | ROUTE_VIEW, VIEW_ROUTE, US_ROUTES, RD_ROUTES, rdSubR, curPath, usSub … and 3 more |
| `app.n380-listeners.js` | layers2.js, piece 41 | 2.0 KB | PVX-N380 - Flow's own inline handlers, as listeners (the page's policy runs no inline handler) |

### backend

| Piece | Built into | Size | What is in it |
| --- | --- | ---: | --- |
| `backend.firebase.js` | app.js, piece 9 | 2.9 KB | pvxIsLobbyAccount, pvxLobbyAccountCard |
| `backend.sign-in.js` | app.js, piece 10 | 7.3 KB | pvxAaCss, pvxAuthAlert, pvxAuthTone, pvxAuthNote, pvxActivateApprovedStaffMember |
| `backend.mapping.js` | app.js, piece 11 | 13.1 KB | _toISO, _fromTS, genTrackCode, genToken, fxVisitEnd, safeProjection, recToDb … and 8 more |
| `backend.backend.js` | app.js, piece 12 | 11.9 KB | Backend, map, cfg, el, label, dot, snap … and 16 more |
| `backend.visits.js` | app.js, piece 13 | 6.8 KB | fvVisitsAll, fvVisitQueries, fvMerge, fvVisitsListen, fvVisitsGet, fvVisitsGetServer, fvKeepBoard … and 4 more |
| `backend.load-and-persist.js` | app.js, piece 14 | 10.2 KB | loadState, fvRowsCopy, pvxPersistEvt, persist, showLogin, updateButtonState, capsCheck … and 2 more |
| `backend.safer-saving.js` | layers.js, piece 8 | 13.7 KB | Flow operations layer 1. Safer saving: only the fields that changed are written, so two screens never erase ea |

### board

| Piece | Built into | Size | What is in it |
| --- | --- | ---: | --- |
| `board.board.js` | app.js, piece 26 | 6.7 KB | renderBoard, cardHTML, wireDnD, moveStatus |
| `board.completion.js` | app.js, piece 31 | 4.5 KB | completePatient, archiveList, renderComplete, wireCompleteZones |

### care-team

| Piece | Built into | Size | What is in it |
| --- | --- | ---: | --- |
| `care-team.care-team.js` | app.js, piece 19 | 22.0 KB | ctRole, ctIso, ctFmt, ctUid, ctRoster, ctStaff, ctProfileUrl … and 27 more |
| `care-team.activity.js` | layers.js, piece 2 | 2.9 KB |  |
| `care-team.roster-layers.js` | layers.js, piece 3 | 8.5 KB |  |

### client-display

| Piece | Built into | Size | What is in it |
| --- | --- | ---: | --- |
| `client-display.client-display.js` | app.js, piece 44 | 13.6 KB | clientStage, stageMinutes, clientJourney, clientSegments, clientBadge, clientVJourney, clientPlaceholder … and 18 more |

### command

| Piece | Built into | Size | What is in it |
| --- | --- | ---: | --- |
| `command.kpis.js` | app.js, piece 22 | 9.5 KB | examPickupsToday, avgExamWaitToday, computeKPIs, countUp, ckpiCard, pvxCanShare, pvxCopyTracker … and 9 more |
| `command.attention.js` | app.js, piece 23 | 8.8 KB | attentionItems, visibleAttentionItems, dismissAlert, clearAllAlerts, setNotificationCount, renderAttention |
| `command.operations.js` | app.js, piece 24 | 12.8 KB | renderDist, docShort, execMetrics, pickedUpToday, isDoctorBlocked, isDoctorAvailableForAssignment, wdComputeTrends … and 5 more |
| `command.ops-menu.js` | app.js, piece 61 | 1.7 KB | opsMenuPlace, opsMenuOpen, opsMenuClose, opsMenuToggle |
| `command.ops-action.js` | app.js, piece 65 | 0.5 KB | opsAction |

### core

| Piece | Built into | Size | What is in it |
| --- | --- | ---: | --- |
| `core.helpers.js` | app.js, piece 1 | 4.2 KB | pvxEsc, pvxEscQ, pvxTyping, pvxPatientById, pvxActivePatient, pvxWho, pvxMe … and 15 more |
| `core.watch.js` | app.js, piece 2 | 3.9 KB | pvxWatch |
| `core.steps.js` | app.js, piece 3 | 2.7 KB | pvxRun, pvxBefore, pvxAfter, pvxWrap |

### critical

| Piece | Built into | Size | What is in it |
| --- | --- | ---: | --- |
| `critical.critical-patient-banner.js` | layers.js, piece 5 | 19.9 KB | Critical Patient alert. One banner, one sound. Shows on every staff screen while an active P1 patient has no d |

### disposition

| Piece | Built into | Size | What is in it |
| --- | --- | ---: | --- |
| `disposition.disposition.js` | app.js, piece 69 | 10.4 KB | dispFirstName, captureDispSnap, restoreDispSnap, renderDisposition, openDispConfirm, closeDispConfirm, submitDisp … and 4 more |
| `disposition.endings.js` | layers.js, piece 17 | 36.4 KB | ENDINGS n120 (Oct 12 2026) — euthanasia and died, from the patient drawer ===== Daniel's choices: a quiet "Oth |
| `disposition.n252-current-patient.js` | layers.js, piece 62 | 3.1 KB | PVX-N252 - every ending acts on the current patient; admissions that never reached Rounds are added (see patch |
| `disposition.n253-who-admits.js` | layers.js, piece 63 | 4.2 KB | PVX-N253 - only doctors, liaisons and management admit (see patch_n253.py) |

### drawer

| Piece | Built into | Size | What is in it |
| --- | --- | ---: | --- |
| `drawer.drawer.js` | app.js, piece 35 | 1.8 KB | openDrawer, closeDrawer, toggle |
| `drawer.records.js` | app.js, piece 38 | 1.5 KB | defaultRecords, getRecords, requestRecords, setRecordStatus |
| `drawer.resus.js` | app.js, piece 39 | 8.2 KB | cprPill, stop, frame, mount, setResusPref, closeResusChooser, _resusOutside … and 7 more |
| `drawer.records-card.js` | app.js, piece 40 | 5.5 KB | recBadge, renderRecordsCard, clinBar |
| `drawer.fill-drawer.js` | app.js, piece 42 | 10.5 KB | fillDrawer |
| `drawer.resus-request.js` | app.js, piece 49 | 3.7 KB | fxIso, fxResusKey, fxStaffKnows, fxResusFromPub, fxResusReqHTML, fxResusReqChip, fxResusAccept … and 1 more |

### flags

| Piece | Built into | Size | What is in it |
| --- | --- | ---: | --- |
| `flags.patient-flags.js` | layers.js, piece 9 | 19.0 KB | patient-flags-oct7 ═════════ Staff-only patient flags (Safety · Handling · Medical · Isolation · Owner). Store |

### forms

| Piece | Built into | Size | What is in it |
| --- | --- | ---: | --- |
| `forms.aftercare-forms.js` | layers.js, piece 18 | 49.5 KB |  |
| `forms.documents.js` | layers.js, piece 19 | 53.4 KB | DOCUMENTS n122 (Oct 13 2026) — Pravix Forms inside Flow ===== Daniel: "Build it" (the Pravix Forms prototype). |

### hig

| Piece | Built into | Size | What is in it |
| --- | --- | ---: | --- |
| `hig.n133-labels.js` | layers.js, piece 29 | 5.0 KB | FL-05 — a <label> without for= names the one control in its field container |
| `hig.n136-rounds-focus.js` | layers.js, piece 30 | 3.8 KB | RD-02: the name button toggles; after the census re-renders, focus goes back to the same patient's toggle |
| `hig.n144-table-region.js` | layers.js, piece 31 | 5.2 KB | FLOW-01: the table region is named and reachable; a hint appears only when columns are off screen |
| `hig.n145-ultrasound-focus.js` | layers.js, piece 32 | 2.5 KB | the case workspace / request editor re-render the queue and the board when they close, so the opening control  |
| `hig.n148-save-chip.js` | layers.js, piece 33 | 1.3 KB | the chip: Saving… → Saved (only on the server's word) · Offline · Not saved |
| `hig.n149-lobby-account-card.js` | layers.js, piece 34 | 0.1 KB | pvxLobbyAccountCard lives next to the account list in Flow's main script (the sign-in handler can run before t |
| `hig.n184-dynamic-type.js` | layers.js, piece 35 | 3.9 KB | PVX-N184 - 1. Dynamic Type on iPhone and iPad: -apple-system-body is 17 pt at the default size; the root follo |
| `hig.n185-glass-guard.js` | layers.js, piece 36 | 1.2 KB | PVX-N185 - Anesia's glass guard, shared on this device (same key): blur stays on only while the device keeps u |
| `hig.n188-reduce-motion-scroll.js` | layers.js, piece 37 | 0.7 KB | PVX-N188 - with Reduce Motion, scripted smooth scrolling jumps instead |
| `hig.n189-symbol-weight.js` | layers.js, piece 38 | 2.8 KB | PVX-N189 - weight matching, Anesia's table: stroke on the 24-pt grid = W(weight) x font size x 0.05 x 24 / ico |
| `hig.n191-meters.js` | layers.js, piece 39 | 2.0 KB | PVX-N191 - bars read their value: capacity rails, status bars and utilisation bars become meters |
| `hig.n192-drag-and-drop-undo.js` | layers.js, piece 40 | 7.7 KB | PVX-N192 - drag and drop: Undo after a move, Escape cancels a Rounds drag, spoken refusals |
| `hig.n192-drop-guard.js` | layers.js, piece 41 | 0.6 KB | PVX-N192 - a file or link dropped where nothing takes it does nothing (the page stays); text fields still take |
| `hig.n193-entering-data.js` | layers.js, piece 42 | 10.7 KB | PVX-N193 - entering data: labels tied to fields, required data before Create, checks as you leave a field, uni |
| `hig.n194-full-screen.js` | layers.js, piece 43 | 2.1 KB | PVX-N194 - full screen: Rounds Display stays in Rounds and follows full screen; the lobby TV's controls come b |
| `hig.n195-launching.js` | layers.js, piece 44 | 3.3 KB | PVX-N195 - launching: theme transitions back on once the first screen is up; remember and restore where you we |
| `hig.n196-offering-help.js` | layers.js, piece 45 | 1.0 KB | PVX-N196 - offering help: Tap on touch, Click with a mouse; money fields edit with one click, tap or Return |
| `hig.n197-notifications.js` | layers.js, piece 46 | 4.7 KB | PVX-N197 - notifications: failures stay; critical ultrasound findings reach the board; Reminder chime setting |
| `hig.n198-action-sheets.js` | layers.js, piece 47 | 5.9 KB | PVX-N198 - action sheets: confirmations and Rounds menus |
| `hig.n202-undo-keys.js` | layers.js, piece 49 | 0.9 KB | PVX-N202 - Cmd-Z / Shift-Cmd-Z (Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y) undo and redo the last change that offered Und |
| `hig.n203-operations-menu-keys.js` | layers.js, piece 50 | 1.5 KB | PVX-N203 - the Operations menu works from the keyboard and gives focus back to + |
| `hig.n209-alerts.js` | layers.js, piece 52 | 1.4 KB | PVX-N209 - alerts: a second action (opts.alt), a description for VoiceOver, Cancel is always Cancel |
| `hig.n211-iphone-sheets.js` | layers.js, piece 53 | 6.8 KB | PVX-N211 - iPhone sheets: Flow's main sheets match Anesia's (HIG Sheets) |
| `hig.n212-search-fields.js` | layers.js, piece 54 | 8.7 KB | PVX-N212 - search fields (HIG Search fields) |
| `hig.n213-tokens.js` | layers.js, piece 55 | 1.0 KB | PVX-N213 - a context menu on every token, and "Added ..." announced once |
| `hig.n214-combo-boxes.js` | layers.js, piece 57 | 2.1 KB | PVX-N214 - combo boxes (HIG Combo boxes): best match first, VoiceOver semantics, Sex as a pop-up |
| `hig.n215-review-time-and-segments.js` | layers.js, piece 59 | 3.0 KB | PVX-N215 - the review time as Day + Time; single-choice segmented controls are radiogroups |
| `hig.n227-decorative-icons.js` | layers.js, piece 60 | 1.2 KB | PVX-N227 - an icon beside its label is decorative: VoiceOver reads the label, not "image". Icons that stand al |
| `hig.n332-principles-accessibility-color.js` | layers2.js, piece 4 | 3.9 KB | n332 · Flow: Design principles, Accessibility, Color (Nov 6 2026) |
| `hig.n334-critical-banner-floats.js` | layers2.js, piece 6 | 4.0 KB | PVX-N334 - 2. the critical-patient banner floats above the page; at the top of the page it no longer covers th |
| `hig.n342-entering-data-names.js` | layers2.js, piece 7 | 1.7 KB | PVX-N342 - HIG Entering data: every field in Triage intake and Edit triage has a name, so VoiceOver and Voice  |
| `hig.n343-feedback.js` | layers2.js, piece 8 | 1.6 KB | PVX-N343 - HIG Feedback: on a Mac or iPad, messages appear under the top bar and Flow's sub-nav, clear of the  |
| `hig.n344-loading.js` | layers2.js, piece 9 | 1.4 KB | PVX-N344 - HIG Loading: until the patient list has really arrived (Backend._gotVisits, n273), Flow shows that  |
| `hig.n345-notification-badge.js` | layers2.js, piece 10 | 1.7 KB | PVX-N345 - HIG Managing notifications: a badge for what's waiting, so it reaches you when Flow isn't the tab o |
| `hig.n346-modality.js` | layers2.js, piece 11 | 1.9 KB | PVX-N346 - HIG Modality: a sheet over the patient drawer (Care team, Ultrasound request, Edit triage, Triage i |
| `hig.n347-offering-help.js` | layers2.js, piece 12 | 1.0 KB | PVX-N347 - HIG Offering help: Flow's help is findable. Typing "help", "shortcuts" or "keyboard" in search offe |
| `hig.n348-printing.js` | layers2.js, piece 13 | 3.4 KB | PVX-N348 - HIG Printing. 1. Command, Patients, the board and Rooms print on white with the screen's controls,  |
| `hig.n349-searching-and-settings.js` | layers2.js, piece 14 | 8.4 KB | PVX-N349 - HIG Searching + Settings. Searching: say what the list and board are filtered by, and let it be cle |
| `hig.n350-undo-and-redo.js` | layers2.js, piece 15 | 7.2 KB | PVX-N350 - HIG Undo and redo. 1. Priority, doctor and liaison changes can be undone (their note's Undo button, |
| `hig.n351-text-and-web-views.js` | layers2.js, piece 16 | 4.4 KB | PVX-N351 - HIG Text views + Web views. 1. The hospital alert's public message and staff note, the triage intak |
| `hig.n352-boxes.js` | layers2.js, piece 17 | 3.5 KB | PVX-N352 - HIG Boxes: each box says what it holds, for VoiceOver too. - The patient drawer's section titles (F |
| `hig.n353-disclosure.js` | layers2.js, piece 18 | 1.6 KB | PVX-N353 - HIG Disclosure controls: Triage details open and close from the keyboard and tell VoiceOver whether |
| `hig.n354-lists-and-tables.js` | layers2.js, piece 19 | 6.4 KB | PVX-N354 - HIG Lists and tables. 1. Selection feedback: while a patient is open, their row on Patients and the |
| `hig.n355-split-views.js` | layers2.js, piece 20 | 2.6 KB | PVX-N355 - HIG Split views: with a patient open, ⌥↓ and ⌥↑ move to the next or previous patient in the order t |
| `hig.n356-tab-and-activity-views.js` | layers2.js, piece 21 | 0.3 KB | PVX-N356 - HIG Tab views + Activity views. See n356/patch_n356.py for the source changes: 1. the share sheet w |
| `hig.n357-buttons-and-context-menus.js` | layers2.js, piece 22 | 0.5 KB | PVX-N357 - HIG Buttons + Context menus. Source changes in n357/patch_n357.py: 1. "Waiting on …" on a board car |
| `hig.n358-dock-menus.js` | layers2.js, piece 23 | 1.2 KB | PVX-N358 - HIG Dock menus: /#find and /#view=… open from the Dock menu, the Mac File menu or a link (/#op=new  |
| `hig.n359-quick-actions.js` | layers2.js, piece 24 | 1.0 KB | PVX-N359 - HIG Home Screen quick actions: with launch_handler focus-existing, choosing New patient, Find a pat |
| `hig.n360-pop-up-buttons.js` | layers2.js, piece 25 | 1.3 KB | PVX-N360 - HIG Pop-up buttons + Pull-down buttons. Source changes in n360/patch_n360.py: 1. pop-up choices are |
| `hig.n361-path-controls-and-search.js` | layers2.js, piece 26 | 0.8 KB | PVX-N361 - HIG Path controls + Search fields. Source changes in n361/patch_n361.py: 1. Flow's search shows the |
| `hig.n362-board-name.js` | layers2.js, piece 27 | 0.2 KB | PVX-N362 - the board view is "Board" (the sub-nav, the iPhone tab bar, its heading, ⌥3's name, Print and the k |
| `hig.n363-tab-bars.js` | layers2.js, piece 28 | 4.1 KB | PVX-N363 - HIG Tab bars: "switch between sections while preserving the current navigation state within each se |
| `hig.n364-token-fields.js` | layers2.js, piece 29 | 0.7 KB | PVX-N364 - HIG Token fields (Add patient's Reason for visit). Source changes in n364/patch_n364.py: 1. a token |
| `hig.n365-gauges-and-progress.js` | layers2.js, piece 30 | 3.3 KB | PVX-N365 - HIG Gauges and Progress indicators (see n365/patch_n365.py): waits that say what they get and when  |
| `hig.n366-action-sheets-and-alerts.js` | layers2.js, piece 31 | 0.4 KB | PVX-N366 - HIG Action sheets and Alerts (second look). Source changes in n366/patch_n366.py: 1. the Hospital a |
| `hig.n367-panels-and-page-controls.js` | layers2.js, piece 32 | 1.3 KB | PVX-N367 - HIG Panels and Page controls (second look; n210 was the first). Source changes in n367/patch_n367.p |
| `hig.n368-scroll-views.js` | layers2.js, piece 33 | 1.2 KB | PVX-N368 - HIG Scroll views. Flow's views scroll in #stage, not the page, so with nothing focused (after openi |
| `hig.n370-sheets-and-windows.js` | layers2.js, piece 34 | 11.8 KB | PVX-N370 - HIG Sheets and Windows (second look) |
| `hig.n371-combo-boxes.js` | layers2.js, piece 35 | 3.3 KB | PVX-N371 - HIG Combo boxes |
| `hig.n372-pickers-and-segmented.js` | layers2.js, piece 36 | 3.4 KB |  |
| `hig.n373-sliders-and-steppers.js` | layers2.js, piece 37 | 1.1 KB |  |
| `hig.n374-text-fields-and-keyboards.js` | layers2.js, piece 38 | 6.8 KB | 1. keyboards that fit the text |
| `hig.n375-shortcuts.js` | layers2.js, piece 39 | 2.7 KB | the lobby TV is untouched |
| `hig.n376-notifications.js` | layers2.js, piece 40 | 1.1 KB | a family message's note opens that patient's conversation |

### incoming

| Piece | Built into | Size | What is in it |
| --- | --- | ---: | --- |
| `incoming.on-the-way.js` | layers.js, piece 21 | 42.7 KB | INCOMING n127 — "On the way" (Oct 13 2026) ═══ A family calls: "we're coming in". Reception adds the patient a |

### intake

| Piece | Built into | Size | What is in it |
| --- | --- | ---: | --- |
| `intake.intake-store.js` | app.js, piece 8 | 2.7 KB | _all, _writeMirror, _saveAll, _emit, _attach, _push, warn |
| `intake.triage-intake.js` | app.js, piece 43 | 4.4 KB | openIntake, closeIntake, renderIntakeBody, commitIntake |
| `intake.translation.js` | app.js, piece 56 | 9.2 KB | langEnglishName, speciesEnglish, normalizeSexValue, getSexDisplayLabel, sexEnglish, endpoint, _fetchT … and 14 more |
| `intake.client-queue.js` | app.js, piece 57 | 13.1 KB | normalizeResusPref, intakeResus, renderAprResus, intakeChip, intakeReasonSummary, renderClientQueue, calculateAgeFromDOB … and 8 more |

### lobby

| Piece | Built into | Size | What is in it |
| --- | --- | ---: | --- |
| `lobby.lobby-sync.js` | app.js, piece 48 | 2.2 KB | fxLobbyOn, lobbyProjection, fxCanon, fxLobbyRef, fxLobbyWrite, fxLobbySync |

### messages

| Piece | Built into | Size | What is in it |
| --- | --- | ---: | --- |
| `messages.messages.js` | app.js, piece 64 | 6.2 KB | updateCommMeta, msgBadge, makeQR, trackUrlFor, renderMessages, loadThread, sendStaffMsg |

### model

| Piece | Built into | Size | What is in it |
| --- | --- | ---: | --- |
| `model.statuses-and-rooms.js` | app.js, piece 4 | 1.1 KB | STATUSES, FLOW_COLS, STAGE_ORDER, ROOMS, ROOM_SPEC |
| `model.doctors-and-liaisons.js` | app.js, piece 5 | 2.2 KB | docSlug, docInitials, doc, patientsForDoctor, activeCountForDoctor, liaison, patientsForLiaison … and 1 more |
| `model.triage-questions.js` | app.js, piece 6 | 2.8 KB | defaultIntake, getIntake, defaultTriage, getTriage, summarizeIntake |
| `model.patient.js` | app.js, piece 7 | 0.9 KB | mAgo, patient, tl |
| `model.staff-roster.js` | layers.js, piece 1 | 17.5 KB |  |
| `model.technicians.js` | layers.js, piece 22 | 0.8 KB |  |

### or-link

| Piece | Built into | Size | What is in it |
| --- | --- | ---: | --- |
| `or-link.flow-and-or.js` | layers.js, piece 24 | 19.6 KB | FLOW ⇄ OR (Oct 2026) ═════════ A surgical case lives on the patient's treatment sheet (sheets/{id}.surgery) —  |

### patients

| Piece | Built into | Size | What is in it |
| --- | --- | ---: | --- |
| `patients.assign.js` | app.js, piece 20 | 2.4 KB | assignDoctor, assignLiaison, setPriority, makeEditable |
| `patients.filter.js` | app.js, piece 21 | 1.0 KB | pvxBoardFiltered, filtered |
| `patients.list.js` | app.js, piece 25 | 5.0 KB | renderFilterBar, renderTable |
| `patients.preview.js` | app.js, piece 67 | 5.9 KB | previewHtml, showPreview, hidePreview |

### rooms

| Piece | Built into | Size | What is in it |
| --- | --- | ---: | --- |
| `rooms.move-room.js` | app.js, piece 32 | 1.1 KB | moveRoom, canDropRoom |
| `rooms.rooms.js` | app.js, piece 34 | 9.6 KB | renderRooms, treatmentCard, wireRoomDnD |
| `rooms.location-drawer.js` | app.js, piece 36 | 2.8 KB | locPatients, openLocDrawer, closeLocDrawer, renderLocDrawer |

### rounds-link

| Piece | Built into | Size | What is in it |
| --- | --- | ---: | --- |
| `rounds-link.rounds-model.js` | app.js, piece 73 | 36.3 KB | rdSvc, rdId, rdIso, rdDate, rdTZ, rdClock, rdDaysAgo … and 67 more |
| `rounds-link.follows-the-sheet.js` | layers.js, piece 13 | 8.0 KB | n116 — Rounds follows the treatment sheet ═════════ One listener per Rounds patient with a sheet. Current trea |
| `rounds-link.two-people-and-undo.js` | layers.js, piece 14 | 10.4 KB | ROUNDS n118 — two people on one patient's rounds, and undo for removals (Oct 2026) ═════════ 1. Saving rounds  |
| `rounds-link.floyd-leftovers.js` | layers.js, piece 16 | 4.8 KB | FLOYD LEFTOVERS n118 (Flow + Rounds) — what the Oct 11 end-to-end test found ===== 1. Rounds lists a problem o |
| `rounds-link.discharge.js` | layers.js, piece 25 | 8.3 KB | ROUNDS ⇄ TREATMENT SHEET — discharge (Oct 2026) ═════════ The doctor plans the discharge in Rounds; whoever is |

### search

| Piece | Built into | Size | What is in it |
| --- | --- | ---: | --- |
| `search.search.js` | app.js, piece 71 | 6.8 KB | searchIndex, closeSearch, renderSearch, highlightSearch, positionSearchResults |

### shell

| Piece | Built into | Size | What is in it |
| --- | --- | ---: | --- |
| `shell.state.js` | app.js, piece 15 | 1.3 KB | _hospDayKey, isTodayHosp, checkHospDayRollover, completedTodayCount |
| `shell.apps.js` | app.js, piece 29 | 2.3 KB | switchAppShell, switchApp |
| `shell.current-user.js` | app.js, piece 37 | 0.4 KB | userDisplayName |
| `shell.views.js` | app.js, piece 45 | 2.4 KB | switchView, scheduleRender, _runQueuedRender, flushRender, renderAll |
| `shell.fullscreen.js` | app.js, piece 63 | 3.0 KB | enterFullscreen, exitFullscreen, ensureFsExit, fsPokeExit, _fsActive, showFsHint, removeFsHint … and 2 more |
| `shell.session.js` | app.js, piece 70 | 1.7 KB | toggleDark, pvxClearPrivateLocalState, logout |
| `shell.ambient-and-clock.js` | app.js, piece 72 | 1.3 KB | updateDashDate |
| `shell.offline-and-updates.js` | layers.js, piece 6 | 7.7 KB | Offline support and automatic updates. - Registers the service worker so Flow opens and shows the last board w |
| `shell.grid-link.js` | layers.js, piece 12 | 0.4 KB | n114 Grid link: only for accounts Grid lets in (keep in step with grid/index.html ALLOWED) |
| `shell.forms-link.js` | layers.js, piece 20 | 0.4 KB | n122 Forms link: only for accounts Forms lets in (keep in step with forms/index.html ALLOWED) |
| `shell.app-links.js` | layers.js, piece 27 | 1.5 KB | n132: Grid and Forms links show only for the accounts those apps let in (keep in step with grid/index.html and |
| `shell.top-bar.js` | layers.js, piece 28 | 6.2 KB | Pravix shared top bar · n132 (audit RX-01, FL-07, DTA-S01, CL-X02, US-04) ═══ The same nav.topnav lives in eve |
| `shell.n305-rounds-own-page.js` | layers2.js, piece 2 | 0.3 KB | n305: anything in Flow that still asks for Rounds opens Rounds' own page |
| `shell.n309-open-patient.js` | layers2.js, piece 3 | 0.5 KB | n309: Rounds' "Show in Flow" opens that patient's drawer here (Flow is its own page since n305) |
| `shell.n333-ultrasound-own-page.js` | layers2.js, piece 5 | 0.3 KB | n333: anything in Flow that still asks for Ultrasound opens Ultrasound's own page |

### shifts

| Piece | Built into | Size | What is in it |
| --- | --- | ---: | --- |
| `shifts.shifts.js` | app.js, piece 66 | 3.0 KB | shiftOfDoctor, applyShiftColors, openShiftSetup, closeShiftSetup, saveShiftSetup |

### tracker

| Piece | Built into | Size | What is in it |
| --- | --- | ---: | --- |
| `tracker.tracker-codes.js` | layers.js, piece 15 | 4.2 KB | TRACKER CODES n118 — a check-in code opens the family tracker only with the pet's name, and only while the vis |

### treatment-link

| Piece | Built into | Size | What is in it |
| --- | --- | ---: | --- |
| `treatment-link.diagnostics-and-admit.js` | layers.js, piece 10 | 9.9 KB | FLOW — Diagnostics → treatment sheet · Admit · Rounds pre-fill · lb→kg as you type (Oct 2026) ═════════ · A pa |
| `treatment-link.admits-from-a-sheet.js` | layers.js, piece 11 | 2.2 KB | FLOW — admits sent from an outpatient treatment sheet (Oct 2026) ═════════ Treatment Sheets' Admit moves the s |
| `treatment-link.flow-to-treatment-sheets.js` | layers.js, piece 23 | 29.0 KB | FLOW → TREATMENT SHEETS ═══ One sheet per visit in the shared `sheets` collection (doc id v_<visitId>), on one |
| `treatment-link.n242-sheet-joins-flow.js` | layers.js, piece 61 | 7.7 KB | n242: a sheet started in Treatment Sheets joins Flow and Rounds |

### triage

| Piece | Built into | Size | What is in it |
| --- | --- | ---: | --- |
| `triage.triage.js` | app.js, piece 41 | 7.9 KB | triageCardHtml, openTriageEdit, closeTriageEdit, saveTriageEdit |

### ui

| Piece | Built into | Size | What is in it |
| --- | --- | ---: | --- |
| `ui.format.js` | app.js, piece 16 | 3.2 KB | initials, spCls, spTag, pmInitial, speciesCode, monoInner, mono … and 12 more |
| `ui.notices.js` | app.js, piece 17 | 4.9 KB | toast, pvxNoteHref, pvxNoteFrag, pvxNoteColor, notify |
| `ui.dropdown.js` | app.js, piece 18 | 7.7 KB | createDropdown, renderTrigger, renderList, choose, reposition, open, close … and 1 more |
| `ui.confirm.js` | app.js, piece 33 | 1.2 KB | showConfirm |
| `ui.overlay.js` | layers.js, piece 26 | 13.5 KB | Pravix shared overlay primitive · n132 ═══ One behaviour for every modal, drawer, popover and scrim in the sui |
| `ui.context-menu.js` | layers.js, piece 48 | 20.1 KB | PVX-CTX n201 (n204: checked options) - one Pravix context menu (HIG Context menus; claude/hig-audit-context-me |
| `ui.keyboard-shortcuts.js` | layers.js, piece 51 | 12.9 KB | PVX-KEYS n207 - the Keyboard shortcuts sheet, shared by Flow and Anesia (HIG The menu bar; claude/hig-audit-me |
| `ui.combo-box.js` | layers.js, piece 56 | 3.2 KB | PVX-COMBO n214 - shared by Flow and Client Check-In (HIG Combo boxes) |
| `ui.segmented.js` | layers.js, piece 58 | 4.1 KB | PVX-SEG (n215, shared) - single-choice segmented controls (HIG Segmented controls). pvxSeg(selector, {label, i |

### ultrasound

| Piece | Built into | Size | What is in it |
| --- | --- | ---: | --- |
| `ultrasound.request.js` | app.js, piece 27 | 8.3 KB | usFlag, usDiagnostics, openUltrasoundRequest, refreshSend, closeUltrasound, sendUltrasound |
| `ultrasound.im-team.js` | app.js, piece 28 | 1.1 KB | imContact, imDoc, drName |
| `ultrasound.roles-and-cases.js` | app.js, piece 30 | 12.1 KB | usCanEdit, isAdminUser, usEmailIsIM, usApplyRoleForUser, usEff, usActiveCases, usOpenCase … and 7 more |

### voice

| Piece | Built into | Size | What is in it |
| --- | --- | ---: | --- |
| `voice.voice-commands.js` | layers.js, piece 7 | 51.7 KB | Voice commands. On for every workstation (approved by VCA IT). Click the mic in the search bar (stops after a  |

### yakuri-link

| Piece | Built into | Size | What is in it |
| --- | --- | ---: | --- |
| `yakuri-link.n254-medications.js` | layers2.js, piece 1 | 3.0 KB | PVX-N254 - Flow and Rounds read Yakuri: Rounds medications link to it; the drawer lists the owner's medication |

## Functions that have layers

The function itself is `NAME$base`, in the piece named first. The layers are in the order they were added (the last is outermost).

| Function | Its own code | Layers, innermost first |
| --- | --- | --- |
| `addProblem` | `add-patient.problems.js` | `hig.n213-tokens.js` wrap |
| `apSetArrival` | `add-patient.fields.js` | `incoming.on-the-way.js` wrap |
| `assignDoctor` | `patients.assign.js` | `backend.safer-saving.js` after · `hig.n350-undo-and-redo.js` wrap |
| `assignLiaison` | `patients.assign.js` | `hig.n350-undo-and-redo.js` wrap |
| `attentionItems` | `command.attention.js` | `hig.n197-notifications.js` wrap |
| `breedFuzzyIndexed` | `add-patient.breeds.js` | `hig.n214-combo-boxes.js` wrap |
| `captureDispSnap` | `disposition.disposition.js` | `disposition.endings.js` wrap |
| `closeCareTeam` | `care-team.care-team.js` | `hig.n211-iphone-sheets.js` wrap |
| `closeDispConfirm` | `disposition.disposition.js` | `disposition.endings.js` after |
| `closeDrawer` | `drawer.drawer.js` | `backend.safer-saving.js` after · `disposition.endings.js` before |
| `commitPatient` | `add-patient.add-patient.js` | `flags.patient-flags.js` wrap · `hig.n371-combo-boxes.js` before · `hig.n375-shortcuts.js` after |
| `completePatient` | `board.completion.js` | `treatment-link.flow-to-treatment-sheets.js` after · `disposition.n252-current-patient.js` wrap · `hig.n350-undo-and-redo.js` wrap |
| `ctAssign` | `care-team.care-team.js` | `care-team.roster-layers.js` wrap |
| `ctFormHTML` | `care-team.care-team.js` | `care-team.roster-layers.js` wrap |
| `ctRoster` | `care-team.care-team.js` | `care-team.roster-layers.js` wrap |
| `ctTouch` | `care-team.care-team.js` | `care-team.roster-layers.js` wrap |
| `dismissAlert` | `command.attention.js` | `hig.n197-notifications.js` wrap |
| `ensureHospitalAutocompletes` | `add-patient.hospitals.js` | `hig.n371-combo-boxes.js` after |
| `fillDrawer` | `drawer.fill-drawer.js` | `care-team.roster-layers.js` wrap · `flags.patient-flags.js` after · `treatment-link.diagnostics-and-admit.js` after · `forms.documents.js` after · `or-link.flow-and-or.js` after · `disposition.n253-who-admits.js` after · `yakuri-link.n254-medications.js` after · `hig.n360-pop-up-buttons.js` wrap |
| `filtered` | `patients.filter.js` | `care-team.roster-layers.js` wrap |
| `fmtTitleCase` | `add-patient.fields.js` | `rounds-link.floyd-leftovers.js` wrap |
| `logout` | `shell.session.js` | `hig.n349-searching-and-settings.js` before |
| `moveRoom` | `rooms.move-room.js` | `backend.safer-saving.js` wrap · `treatment-link.flow-to-treatment-sheets.js` wrap · `hig.n192-drag-and-drop-undo.js` wrap · `hig.n350-undo-and-redo.js` wrap |
| `moveStatus` | `board.board.js` | `treatment-link.diagnostics-and-admit.js` wrap · `hig.n192-drag-and-drop-undo.js` wrap · `disposition.n253-who-admits.js` wrap · `hig.n350-undo-and-redo.js` wrap |
| `openAddPatient` | `add-patient.add-patient.js` | `incoming.on-the-way.js` wrap · `hig.n193-entering-data.js` after · `disposition.n253-who-admits.js` after |
| `openAlertModal` | `alerts.hospital-alert.js` | `hig.n351-text-and-web-views.js` wrap |
| `openCareTeam` | `care-team.care-team.js` | `hig.n211-iphone-sheets.js` wrap |
| `openDispConfirm` | `disposition.disposition.js` | `disposition.endings.js` wrap · `disposition.n253-who-admits.js` wrap |
| `openDrawer` | `drawer.drawer.js` | `backend.safer-saving.js` after · `flags.patient-flags.js` before · `hig.n212-search-fields.js` after · `hig.n351-text-and-web-views.js` after · `hig.n354-lists-and-tables.js` after |
| `openIntake` | `intake.triage-intake.js` | `hig.n351-text-and-web-views.js` wrap |
| `openTriageEdit` | `triage.triage.js` | `rounds-link.floyd-leftovers.js` after · `hig.n193-entering-data.js` after · `hig.n351-text-and-web-views.js` wrap |
| `openUltrasoundRequest` | `ultrasound.request.js` | `hig.n351-text-and-web-views.js` wrap · `hig.n370-sheets-and-windows.js` after |
| `openUsxCase` | `ultrasound.roles-and-cases.js` | `hig.n136-rounds-focus.js` before |
| `opsAction` | `command.ops-action.js` | `hig.n212-search-fields.js` wrap |
| `opsMenuClose` | `command.ops-menu.js` | `hig.n203-operations-menu-keys.js` wrap |
| `opsMenuOpen` | `command.ops-menu.js` | `hig.n203-operations-menu-keys.js` after |
| `rdSetOutcome` | `rounds-link.rounds-model.js` | `rounds-link.discharge.js` wrap |
| `rdTouch` | `rounds-link.rounds-model.js` | `treatment-link.flow-to-treatment-sheets.js` after |
| `renderAlertModal` | `alerts.hospital-alert.js` | `hig.n211-iphone-sheets.js` wrap · `hig.n215-review-time-and-segments.js` after · `hig.n370-sheets-and-windows.js` after · `hig.n372-pickers-and-segmented.js` after |
| `renderAll` | `shell.views.js` | `hig.n197-notifications.js` after |
| `renderAttention` | `command.attention.js` | `hig.n197-notifications.js` after |
| `renderBoard` | `board.board.js` | `hig.n349-searching-and-settings.js` after |
| `renderComplete` | `board.completion.js` | `disposition.endings.js` after |
| `renderDisposition` | `disposition.disposition.js` | `disposition.endings.js` after · `disposition.n253-who-admits.js` wrap |
| `renderProblemChips` | `add-patient.problems.js` | `hig.n214-combo-boxes.js` after |
| `renderSearch` | `search.search.js` | `hig.n212-search-fields.js` wrap · `hig.n349-searching-and-settings.js` wrap |
| `renderTable` | `patients.list.js` | `hig.n349-searching-and-settings.js` after · `hig.n354-lists-and-tables.js` after |
| `restoreDispSnap` | `disposition.disposition.js` | `disposition.endings.js` wrap |
| `searchIndex` | `search.search.js` | `hig.n212-search-fields.js` wrap · `hig.n347-offering-help.js` wrap · `hig.n348-printing.js` wrap · `hig.n349-searching-and-settings.js` wrap |
| `setPriority` | `patients.assign.js` | `hig.n350-undo-and-redo.js` wrap |
| `setResusPref` | `drawer.resus.js` | `treatment-link.flow-to-treatment-sheets.js` after |
| `showConfirm` | `ui.confirm.js` | `hig.n193-entering-data.js` before · `hig.n198-action-sheets.js` wrap · `hig.n209-alerts.js` wrap |
| `showUndo` | `disposition.disposition.js` | `hig.n365-gauges-and-progress.js` after |
| `submitDisp` | `disposition.disposition.js` | `disposition.n253-who-admits.js` wrap |
| `switchView` | `shell.views.js` | `forms.aftercare-forms.js` after · `hig.n363-tab-bars.js` wrap |
