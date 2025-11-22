export const hostRegex:    RegExp = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
export const anyUuidRegex: RegExp = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const uuid4Regex:   RegExp = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const emailRegex:   RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
