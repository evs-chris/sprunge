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
