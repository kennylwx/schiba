import { logger } from './logger';

export function logDabi(): null {
  // ANSI color codes for 3D gradient effect
  const colors = {
    bright: '\x1b[38;5;51m', // Bright cyan (front face)
    medium: '\x1b[38;5;45m', // Medium cyan (middle)
    dark: '\x1b[38;5;39m', // Darker cyan (sides)
    shadow: '\x1b[38;5;33m', // Dark blue (shadows)
    highlight: '\x1b[38;5;87m', // Light cyan (highlights)
    accent: '\x1b[38;5;123m', // Very light (edges)
  };

  const reset = '\x1b[0m';

  // Properly aligned 3D ASCII art
  const asciiArt = [
    '',
    `${colors.highlight}    ██████╗  █████╗ ██████╗ ██╗`,
    `${colors.bright}    ██╔══██╗██╔══██╗██╔══██╗██║`,
    `${colors.medium}    ██║  ██║███████║██████╔╝██║`,
    `${colors.dark}    ██║  ██║██╔══██║██╔══██╗██║`,
    `${colors.shadow}    ██████╔╝██║  ██║██████╔╝██║`,
    `${colors.shadow}    ╚═════╝ ╚═╝  ╚═╝╚═════╝ ╚═╝`,
    '',
  ];

  // Choose the cleanest looking one
  const selectedArt = asciiArt;

  // Log each line
  selectedArt.forEach((line) => {
    logger.info(line + reset);
  });

  // Add a subtle divider
  logger.info(`${colors.accent}    ${'═'.repeat(40)}${reset}`);

  return null;
}
