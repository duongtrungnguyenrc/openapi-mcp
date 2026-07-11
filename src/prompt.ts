interface Option {
  name: string;
  value: string;
  selected: boolean;
}

export function promptMultiSelect(question: string, options: Option[]): Promise<string[]> {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      // Non-interactive fallback: return whatever started as selected
      return resolve(options.filter((o) => o.selected).map((o) => o.value));
    }

    const stdin = process.stdin;
    const stdout = process.stdout;

    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    // Hide cursor
    stdout.write("\x1B[?25l");

    let cursor = 0;
    let firstRender = true;

    function render() {
      if (!firstRender) {
        // Move up options.length + 1 lines (options + question line)
        stdout.write(`\r\x1B[K`); // Clear current line
        for (let i = 0; i <= options.length; i++) {
          stdout.write(`\x1B[1A\x1B[2K`);
        }
      }
      firstRender = false;

      stdout.write(`${question}\n`);
      options.forEach((opt, idx) => {
        const checkbox = opt.selected ? "[\u25CF]" : "[ ]"; // Black circle or empty box
        const pointer = idx === cursor ? ">" : " ";
        const color = idx === cursor ? "\x1B[36m" : ""; // Cyan for active option
        const reset = "\x1B[0m";
        stdout.write(`${pointer} ${color}${checkbox} ${opt.name}${reset}\n`);
      });
    }

    render();

    function onKey(key: string) {
      if (key === "\u0003") {
        // Ctrl+C
        cleanup();
        stdout.write("\n");
        process.exit(130);
      }

      if (key === "\r" || key === "\n") {
        // Enter
        cleanup();
        stdout.write("\n");
        resolve(options.filter((o) => o.selected).map((o) => o.value));
        return;
      }

      if (key === " " || key === "\u0020") {
        // Space
        options[cursor].selected = !options[cursor].selected;
        render();
        return;
      }

      // Handle arrow keys
      if (key === "\u001b[A" || key === "k") {
        // Up
        cursor = cursor > 0 ? cursor - 1 : options.length - 1;
        render();
        return;
      }

      if (key === "\u001b[B" || key === "j") {
        // Down
        cursor = cursor < options.length - 1 ? cursor + 1 : 0;
        render();
        return;
      }
    }

    function cleanup() {
      stdin.removeListener("data", onKey);
      try {
        stdin.setRawMode(false);
      } catch {
        // ignore errors if stdin was closed or doesn't support raw mode anymore
      }
      stdin.pause();
      // Show cursor
      stdout.write("\x1B[?25h");
    }

    stdin.on("data", onKey);
  });
}
