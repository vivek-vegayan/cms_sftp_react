/**
 * Single source of truth for the shell's sidebar widths — Header and
 * SideBar both read from here instead of each hardcoding the same pixel
 * values (previously duplicated by convention between the two files).
 */
export const DRAWER_WIDTH = 240;
export const COLLAPSED_WIDTH = 70;

/** Left padding the header reserves on mobile, where the sidebar is an
 * overlay (temporary) drawer rather than a permanent rail — just enough
 * room for the hamburger toggle, not a full rail width. */
export const MOBILE_HEADER_INSET = 60;

/**
 * Min height every page shell's root surface must claim.
 *
 * Shells paint their own tinted background, so any shell shorter than the
 * viewport reads as a "half-height box" floating on the app background —
 * most visibly on a first load, where the shell is up before its route
 * chunk/data (previously `height: "auto"` + a `60vh`/`65vh` content region,
 * which is exactly what that box was). The header is a fixed overlay and
 * every shell's top inset is *padding* inside a `border-box` element, so a
 * flat `100vh` fills the viewport exactly without adding a stray scrollbar.
 */
export const SHELL_MIN_HEIGHT = "100vh";
