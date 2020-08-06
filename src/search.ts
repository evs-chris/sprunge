/**
 * Searches for x in str
 *
 * @param str - a sorted haystack
 * @param x - a needle
 *
 * Does a search for x in str using the most appropriate method based
 * on the length of str.
 */
export function contains(str: string, x: string): boolean { 
  let start = 0, end = str.length - 1; 
  if (end < 4) {
    if (end === 0) return str === x;
    if (end === 1) return str[0] === x || str[1] === x;
    if (end === 2) return str[0] === x || str[1] === x || str[2] === x;
    if (end === 3) return str[0] === x || str[1] === x || str[2] === x || str[3] === x;
  } else {
    if (x < str[0] || x > str[end]) return false;
    if (end < 80) {
      for (let i = 0; i <= end; i++) if (str[i] === x) return true;
    } else {
      let mid: number;
      let c: string;

      while (start <= end) { 
        mid = (start + end) >> 1; 
        c = str[mid];

        if (c === x) return true; 
        else if (c < x) start = mid + 1; 
        else end = mid - 1; 
      }
    }
  }

  return false; 
} 

function contains0(): boolean {
  return false;
}

function contains1(str: string, x: string): boolean {
  return str === x;
}

function contains2(str: string, x: string): boolean {
  return str[0] === x || str[1] === x;
}

function contains3(str: string, x: string): boolean {
  return str[0] === x || str[1] === x || str[2] === x;
}

function contains4(str: string, x: string): boolean {
  return str[0] === x || str[1] === x || str[2] === x || str[3] === x;
}

function contains5(str: string, x: string): boolean {
  return str[0] === x || str[1] === x || str[2] === x || str[3] === x || str[4] === x;
}

function contains6(str: string, x: string): boolean {
  return str[0] === x || str[1] === x || str[2] === x || str[3] === x || str[4] === x || str[5] === x;
}

function contains7(str: string, x: string): boolean {
  return str[0] === x || str[1] === x || str[2] === x || str[3] === x || str[4] === x || str[5] === x || str[6] === x;
}

function contains8(str: string, x: string): boolean {
  return str[0] === x || str[1] === x || str[2] === x || str[3] === x || str[4] === x || str[5] === x || str[6] === x || str[7] === x;
}

function contains9(str: string, x: string): boolean {
  return str[0] === x || str[1] === x || str[2] === x || str[3] === x || str[4] === x || str[5] === x || str[6] === x || str[7] === x || str[8] === x;
}

function contains10(str: string, x: string): boolean {
  return str[0] === x || str[1] === x || str[2] === x || str[3] === x || str[4] === x || str[5] === x || str[6] === x || str[7] === x || str[8] === x || str[9] === x;
}

function containsFor(str: string, x: string): boolean {
  const len = str.length;
  for (let i = 0; i < len; i++) if (str[i] === x) return true;
  return false;
}

function containsBinary(str: string, x: string): boolean {
  let end = str.length - 1;
  let start = 0;
  if (x < str[0] || x > str[end]) return false;
  let mid: number;
  let c: string;

  while (start <= end) { 
    mid = (start + end) >> 1; 
    c = str[mid];

    if (c === x) return true; 
    else if (c < x) start = mid + 1; 
    else end = mid - 1; 
  }
}

export type SearchFn = (str: string, x: string) => boolean;

/**
 * Returns an optimized function to search for a character in a string.
 *
 * @param str - the string to optimize the search for when sorted
 */
export function getSearch(str: string, sorted: boolean = true): SearchFn {
  const len = str.length;
  if (len === 0) return contains0;
  if (len === 1) return contains1;
  if (len === 2) return contains2;
  if (len === 3) return contains3;
  if (len === 4) return contains4;
  if (len === 5) return contains5;
  if (len === 6) return contains6;
  if (len === 7) return contains7;
  if (len === 8) return contains8;
  if (len === 9) return contains9;
  if (len === 10) return contains10;
  if (sorted) return containsBinary;
  else return containsFor;
}
