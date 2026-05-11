#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NPC_DIR="$ROOT_DIR/frontend/public/npcs"
BACKUP_ROOT="$NPC_DIR/old"
DRY_RUN=false

usage() {
  cat <<USAGE
Usage: $(basename "$0") [--dry-run]

Resizes PNGs in frontend/public/npcs so any image larger than 128x128
becomes 128px tall while preserving aspect ratio.
Original files are moved to frontend/public/npcs/old/<timestamp>/.
USAGE
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
elif [[ $# -gt 0 ]]; then
  echo "Unknown argument: $1" >&2
  usage
  exit 1
fi

if command -v magick >/dev/null 2>&1; then
  IMG_CMD=(magick)
  IDENTIFY_CMD=(magick identify)
elif command -v convert >/dev/null 2>&1 && command -v identify >/dev/null 2>&1; then
  IMG_CMD=(convert)
  IDENTIFY_CMD=(identify)
else
  echo "ImageMagick not found. Install 'magick' (preferred) or 'convert' + 'identify'." >&2
  exit 1
fi

if [[ ! -d "$NPC_DIR" ]]; then
  echo "Directory not found: $NPC_DIR" >&2
  exit 1
fi

shopt -s nullglob

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
RUN_BACKUP_DIR="$BACKUP_ROOT/$TIMESTAMP"
BACKUP_CREATED=false

checked=0
resized=0
skipped=0

for file in "$NPC_DIR"/*.png; do
  [[ -f "$file" ]] || continue
  checked=$((checked + 1))

  read -r width height < <("${IDENTIFY_CMD[@]}" -format '%w %h\n' "$file")

  if (( width <= 128 && height <= 128 )); then
    skipped=$((skipped + 1))
    continue
  fi

  base_name="$(basename "$file")"
  backup_path="$RUN_BACKUP_DIR/$base_name"

  if [[ "$DRY_RUN" == true ]]; then
    echo "[dry-run] would resize $base_name (${width}x${height} -> height 128)"
    continue
  fi

  if [[ "$BACKUP_CREATED" == false ]]; then
    mkdir -p "$RUN_BACKUP_DIR"
    BACKUP_CREATED=true
  fi

  if [[ -e "$backup_path" ]]; then
    name_no_ext="${base_name%.png}"
    n=1
    while [[ -e "$RUN_BACKUP_DIR/${name_no_ext}_$n.png" ]]; do
      n=$((n + 1))
    done
    backup_path="$RUN_BACKUP_DIR/${name_no_ext}_$n.png"
  fi

  mv "$file" "$backup_path"

  "${IMG_CMD[@]}" "$backup_path" \
    -resize x128 \
    -strip \
    -define png:compression-level=9 \
    "$file"

  resized=$((resized + 1))
  echo "resized $base_name (${width}x${height} -> 128h)"
done

if [[ "$DRY_RUN" == true ]]; then
  echo "dry-run complete: checked=$checked oversized=$((checked - skipped)) skipped=$skipped"
else
  echo "complete: checked=$checked resized=$resized skipped=$skipped"
  if [[ "$BACKUP_CREATED" == true ]]; then
    echo "backups: $RUN_BACKUP_DIR"
  else
    echo "no backups created (nothing needed resizing)"
  fi
fi
