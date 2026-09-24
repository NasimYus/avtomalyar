// Command seed provides seed-admin and seed-demo subcommands used by the
// Makefile. Implemented incrementally as the underlying modules land.
package main

import (
	"fmt"
	"os"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: seed <admin|demo>")
		os.Exit(1)
	}

	switch os.Args[1] {
	case "admin":
		fmt.Fprintln(os.Stderr, "seed admin: not implemented yet")
		os.Exit(1)
	case "demo":
		fmt.Fprintln(os.Stderr, "seed demo: not implemented yet")
		os.Exit(1)
	default:
		fmt.Fprintf(os.Stderr, "unknown subcommand %q\n", os.Args[1])
		os.Exit(1)
	}
}
