## 0.1.0

2020-12-02

### Bugs

* JSON-ish numbers should not start with a separator (`_`).

### Not bugs

* Split detailed error tracking into messages (`detailed`) and causal (`causes`), because keeping a cause tree is expensive if you just want a hint as to why parsing failed at a specific point.
* The latest cause is also tracked separately if detailed messages are enabled, so that it can be included without requiring the full cause tree.
* The `str` parsers no longer single quotes the expected strings in their error messages.

## 0.0.4

2020-11-28

### Bugs

* `rep1sep` will no longer consume a `disallow`ed trailing separator.

### Not bugs

* Parsers that generate a sorted character list for matching will now also make sure the list is unique.
* Added a `debug` parser that will break before applying the wrapped parser.
* Added an `istr` parser for case-insensitive string matching. This parser is much more expensive than `str`, as it can't just match char for char, and instead, combines `read1`, a `toLowerCase`, and a lookup in the source array.
* Added an `outer` parser that returns the input substring matched by the wrapped parser.

## 0.0.3

2020-11-20

### Not bugs

* Added a `skip1` parser that requires matching at least one character.

## 0.0.2

2020-08-06

### Not bugs

* The UMD bundle now includes everything.
* `ParseError`s now include a `latest` member with the deepest parse error available if it is not the same as the top-level error. This is only available with the `detailed` parse option enabled.
* Added the `notchars` parser generator to read a number of chars that _don't_ match a list. This is used in the json string escape parser to avoid bad hex and unicode escapes.

## 0.0.1

2020-08-04

* Initial release.
