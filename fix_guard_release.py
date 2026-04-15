from pathlib import Path 
p = Path(r'C:\Users\Raven.Hogan\OneDrive - AJW Group PLC\Zepha-app\zepha\app\(tabs)\index.tsx') 
lines = p.read_text(encoding='utf-8').splitlines() 
lines = lines[:2232] 
lines[629:639] = [ 
'  if (toTrueState === STATES.IDLE) {', 
'    if (fromVisibleState === STATES.GUARD) {', 
'      pushStep(" "watch, STATES.WATCH, guard" must exhale through "watch);', 
'      pushStep(curious, STATES.CURIOUS, linger" in soft noticing before "settling);', 
'    } else if (fromVisibleState === STATES.WATCH) {', 
'      pushStep(curious, STATES.CURIOUS, release" intensity through a reading "beat);', 
'    }', 
'    pushStep(idle, STATES.IDLE, return" to the calm "edge);', 
'    return { reason: idle" "baseline, steps };', 
'  }', 
] 
lines[651:668] = [ 
'  if (toTrueState === STATES.SLEEP) {', 
'    if (fromVisibleState === STATES.GUARD) {', 
'      pushStep(watch, STATES.WATCH, release" guard "first);', 
'      pushStep(curious, STATES.CURIOUS, make" sure the moment is really "over);', 
'      pushStep(idle, STATES.IDLE, settle" before "sleep);', 
'    } else if (fromVisibleState === STATES.WATCH) {', 
'      pushStep(curious, STATES.CURIOUS, let" the edge attention "soften);', 
'      pushStep(idle, STATES.IDLE, come" back to the "edge);', 
'    } else if (fromVisibleState === STATES.CURIOUS) {', 
'      pushStep(idle, STATES.IDLE, come" back to the "edge);', 
'    }', 
'    pushStep(sleep, STATES.SLEEP, return" to the "web);', 
'    return { reason: sleep" "wind-down, steps };', 
'  }', 
'', 
'  if (toTrueState === STATES.LIGHT_WAKE) {', 
'    pushStep(light_wake, STATES.LIGHT_WAKE, light" wake "acknowledgement);', 
'    return { reason: light" "wake, steps };', 
'  }', 
] 
p.write_text(chr(10).join(lines) + chr(10), encoding='utf-8') 
