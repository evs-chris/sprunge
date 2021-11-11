## 0.4.1

2021-11-11

### Not bugs

* There is a new parsing mode `undefinedOnError` that simply returns undefined when parsing fails rather than cause information. This is particularly useful if you don't care about the result of a parse and only want to easily see if it produced a result, as you don't have to distinguish between a cause object and legitimate output.

## 0.4.0

2021-10-04

### Not bugs

* There is a new parse tree parsing mode `compact` that, when combined with the new ability to specify a parser as `primary` via its name, will result in a much more compact parse tree composed only of primary named nodes. Gaps between primary node children are mapped in an `extra` map on parse nodes that specify start and end position within the source string that are covered by the node but not any of its children.

## 0.3.1

2021-05-10

### Bugs(?)

* `map` parsers that use the error function to further check the result of the inner parser now use the position of the successful inner parser for the resulting error. This is done because alternates that match further in but fail, possibly even within the mapped parser, tend to be further along in the input than the beginning of the `map` starting point. Using the successful mapped parser position for the error tends to make it bubble up as the latest error in parsing.

## 0.3.0

2021-05-10

### Not bugs

* Parsers with names now try to carry their name through for error messages. This allows setting a name at the `map`/`alt` level to specify a name for a `read` failure. You can also wrap nameless parsers in a `name` parser to give them a name. The combinators will only apply their name to a failure if the failure isn't already named.
* There are now case-insensitive versions of the character-based parsers i.e. `iskip`, `ichar`, `iread`, `iread1`, `ireadTo`, `iread1To`, `notichars`. These parsers do not covert their matched content to any particular case.

### Random other stuff

* The tests are now split out a little more logically.
* A few previously untested parsers are now tested.
* There is test coverage for parser names.

## 0.2.0

2021-04-14

### Bugs

* Looking for a line numbers for error messages in a string that only contains newlines will no longer activate your processor's space heater mode.

### Not bugs

* `map` now gets a second function argument that can be called with an error to fail the parser.
* `ParseFn`s now support an option that generates a parse tree rather then the direct results of the parsers. This complicates writing some types of parsers, but makes writing accurate error feedback much easier. Most parsers can now be named.
* `ParseFn`s can now accept a `trim` option that will remove whitespace from the beginning and end of the input string before parsing.
* There is now a `not` combinator that fails if its wrapper parser succeeds.

## 0.1.1

2020-12-07

### Not bugs

* Add `andNot` parser where the first wrapped parser will succeed only of the second wrapped parser does not.

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
