use std::fs;
use std::io::Write;
use std::path::Path;

/// Writes `json` to `path` via the same tmp-file-then-rename pattern
/// everywhere this app persists state, so a crash or power loss mid-write
/// never leaves a truncated or partially-written file at `path`.
pub fn write_json(path: &Path, json: &[u8]) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let tmp = path.with_extension("json.tmp");
    {
        let mut file = fs::File::create(&tmp).map_err(|e| e.to_string())?;
        file.write_all(json).map_err(|e| e.to_string())?;
        file.sync_all().map_err(|e| e.to_string())?;
    }
    fs::rename(&tmp, path).map_err(|e| e.to_string())
}
