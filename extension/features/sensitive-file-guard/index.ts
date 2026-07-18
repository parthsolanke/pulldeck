// Build order step 3. Pattern-match a tagged file's path against a denylist
// (.env, .pem, .key, id_rsa, common secrets-manager filenames) and warn
// before injecting its contents into a chat. Cheap to build — a pattern
// match, not a scanning service — worth having before any real usage.
export {};
