/**
 * @file seatLayoutHelper.js
 * Utility for flexible seat numbering schemes and physical bus markings.
 * Supports:
 * - 'deck_prefix': e.g. Lower deck 'A1..A18', Upper deck 'B1..B18' or 'L01..L18', 'U01..U18'
 * - 'continuous_numeric': e.g. 1..18 on lower, 19..36 on upper
 * - 'row_letter': e.g. 1A, 1B, 1C, 2A, 2B, 2C (standard for minivans & airlines)
 * - 'column_row': e.g. A1, B1, C1, A2, B2, C2 (column letter + row number)
 * - 'custom': manual per-seat label overrides (e.g. VIP-1, G1, skipping unlucky numbers 13 or 4)
 */

export const NUMBERING_SCHEMES = {
  DECK_PREFIX: 'deck_prefix',
  CONTINUOUS_NUMERIC: 'continuous_numeric',
  ROW_LETTER: 'row_letter',
  COLUMN_ROW: 'column_row',
  CUSTOM: 'custom'
};

export class SeatLayoutHelper {
  /**
   * Generates seat labels for a deck based on chosen numbering scheme
   * @param {Object} options
   * @param {string} options.scheme - 'deck_prefix' | 'continuous_numeric' | 'row_letter' | 'column_row'
   * @param {number} options.rows - number of rows
   * @param {number} options.columns - number of columns
   * @param {string} [options.deckPrefix='A'] - e.g. 'A' for lower, 'B' for upper
   * @param {number} [options.startNumber=1] - starting index for numeric schemes
   * @param {boolean} [options.padZero=true] - format numbers as '01' vs '1'
   * @param {Object} [options.customOverrides={}] - { [seatId]: 'VIP-1' }
   * @returns {Array<{ id: string, label: string, row: number, col: number }>}
   */
  static generateDeckSeats({
    scheme = NUMBERING_SCHEMES.DECK_PREFIX,
    rows = 6,
    columns = 3,
    deckPrefix = 'A',
    startNumber = 1,
    padZero = false,
    customOverrides = {}
  }) {
    const seats = [];
    let counter = startNumber;

    const colLetters = ['A', 'B', 'C', 'D', 'E'];

    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= columns; c++) {
        const seatId = `${deckPrefix}_r${r}_c${c}`;
        let label = '';

        if (customOverrides[seatId]) {
          label = customOverrides[seatId];
        } else {
          switch (scheme) {
            case NUMBERING_SCHEMES.DECK_PREFIX: {
              const numStr = padZero ? String(counter).padStart(2, '0') : String(counter);
              label = `${deckPrefix}${numStr}`;
              counter++;
              break;
            }
            case NUMBERING_SCHEMES.CONTINUOUS_NUMERIC: {
              label = padZero ? String(counter).padStart(2, '0') : String(counter);
              counter++;
              break;
            }
            case NUMBERING_SCHEMES.ROW_LETTER: {
              const colChar = colLetters[c - 1] || String(c);
              label = `${r}${colChar}`;
              break;
            }
            case NUMBERING_SCHEMES.COLUMN_ROW: {
              const colChar = colLetters[c - 1] || String(c);
              label = `${colChar}${r}`;
              break;
            }
            default: {
              label = `${deckPrefix}${counter++}`;
            }
          }
        }

        seats.push({
          id: seatId,
          label,
          row: r,
          col: c
        });
      }
    }

    return seats;
  }

  /**
   * Applies custom seat labeling to an existing deck layout
   * @param {Object} deck - Deck configuration
   * @param {string} [scheme] - numbering scheme to apply
   * @param {string} [prefix] - deck prefix
   * @param {Object} [manualOverrides] - per-seat overrides
   * @returns {Object} updated deck
   */
  static applyNumberingScheme(deck, { scheme, prefix, manualOverrides = {} } = {}) {
    if (!deck || !Array.isArray(deck.rows)) return deck;

    const usedPrefix = prefix ?? deck.deckPrefix ?? (deck.id === 'lower' ? 'A' : 'B');
    const usedScheme = scheme ?? deck.numberingScheme ?? NUMBERING_SCHEMES.DECK_PREFIX;

    let counter = deck.startNumber ?? (deck.id === 'upper' ? 19 : 1);
    const colLetters = ['A', 'B', 'C', 'D', 'E'];

    const updatedRows = deck.rows.map(row => {
      const updatedSeats = (row.seats || []).map(seat => {
        if (manualOverrides[seat.id]) {
          return { ...seat, label: manualOverrides[seat.id] };
        }

        let newLabel = seat.label;
        switch (usedScheme) {
          case NUMBERING_SCHEMES.DECK_PREFIX: {
            const num = String(counter++).padStart(2, '0');
            newLabel = `${usedPrefix}${num}`;
            break;
          }
          case NUMBERING_SCHEMES.CONTINUOUS_NUMERIC: {
            newLabel = String(counter++).padStart(2, '0');
            break;
          }
          case NUMBERING_SCHEMES.ROW_LETTER: {
            const colChar = colLetters[(seat.col || 1) - 1] || 'A';
            newLabel = `${row.rowNumber}${colChar}`;
            break;
          }
          case NUMBERING_SCHEMES.COLUMN_ROW: {
            const colChar = colLetters[(seat.col || 1) - 1] || 'A';
            newLabel = `${colChar}${row.rowNumber}`;
            break;
          }
          default:
            break;
        }

        return {
          ...seat,
          label: newLabel
        };
      });

      return {
        ...row,
        seats: updatedSeats
      };
    });

    return {
      ...deck,
      deckPrefix: usedPrefix,
      numberingScheme: usedScheme,
      rows: updatedRows
    };
  }
}
