// Package storage saves uploaded files (currently prize photos) to a local
// directory, served back by the API under /media/.
package storage

import (
	"fmt"
	"os"
	"path/filepath"
)

// FileStore writes files under a base directory, keyed by a subdirectory
// and filename the caller controls (never derived from user input as-is).
type FileStore struct {
	baseDir string
}

// New returns a FileStore rooted at baseDir, creating it if necessary.
func New(baseDir string) (*FileStore, error) {
	if err := os.MkdirAll(baseDir, 0o750); err != nil {
		return nil, fmt.Errorf("create upload dir: %w", err)
	}
	return &FileStore{baseDir: baseDir}, nil
}

// Save writes data to <baseDir>/<subdir>/<filename> and returns the path
// relative to baseDir (e.g. "prizes/3-1700000000.jpg"), suitable for
// storing in the database and serving under /media/.
func (f *FileStore) Save(subdir, filename string, data []byte) (string, error) {
	dir := filepath.Join(f.baseDir, subdir)
	if err := os.MkdirAll(dir, 0o750); err != nil {
		return "", fmt.Errorf("create %s dir: %w", subdir, err)
	}

	relPath := filepath.Join(subdir, filename)
	if err := os.WriteFile(filepath.Join(f.baseDir, relPath), data, 0o600); err != nil {
		return "", fmt.Errorf("write file: %w", err)
	}
	return relPath, nil
}

// Dir returns the base directory, for mounting a static file server over
// it.
func (f *FileStore) Dir() string {
	return f.baseDir
}
