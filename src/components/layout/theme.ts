export const THEME_KEY = "catchup-theme";

/** Runs in <head> before first paint, so a saved theme never flashes the other one. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
