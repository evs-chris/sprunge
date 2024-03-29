# sprunge

A parser combinator library for TS/JS, loosely based on a vague feeling I once had about how Scala parser combinators worked.

## Why?

Because I have a hard time grokking most of the parsing stuff that's available out there - BNF, scanners, lexers, tokenizers. I understand enough about traditional parsing to shoot myself in the foot spectacularly. Parser combinators, on the other hand are the right mix of abstract and declarative for my limited brain to work with. Taking primitive parsers and combining them to extract what you need from a string is something that's easier for me to follow. I also understand that BNF is basically exactly that, but most libraries have some proxy for BNF that becomes incomprehensible to me.

There are a few other library-based parsers, like Myna and Parsimmon, which appear to be quite nice, but don't really jive with how I like to define parsers. Maybe I just like the study of wheels and their innovative mechanisms.

## OK, fine. How?

You're not using a scanner to feed a lexer to feed a parser... what are you doing?

Letting the parsers scan for themselves, giving you all the power you could ever need in the parser - you can look forward or backward in the input string, as all the parser is given is the input string and the current position. Parsers then return either failure or success as a result and a new position, which could theoretically be before the initial position _&lt;insert surprised pikachu face&gt;_.

There are a few built-in primitive parsers that do things like skip certain characters, read certain characters, read any characters until a certain character, read specific strings, read a specific number of characters, etc. There are also a few built-in combinators that do things like apply a parser repeatedly to build an array of results, apply a parser repeatedly interleaved with a separator parser to build an array of results, apply a sequence of parsers in order, apply a parser if possible without failing, apply given parsers in order until one succeeds, apply a given parser and apply a transform to its result, etc.

So you're just reading through the string one character at a time, which is not super slow. Why not just use regular expressions? I'm glad you asked that, because it's something I've done in the past. Beyond fairly simple parsers that don't require multiple regular expressions, there are only two approaches to parsing using regexes that I've found in js: `substr` and apply the regex, or trick the regex into applying from a certain index in the string as if it had already matched up to that point. Neither of those options is particularly performant everywhere. For instance, did you know that mobile Safari (surprise, surprise, it's the new IE mucking things up) would at some point absolutely give up on life if you `substr`ed too many times with a large source string? It may still do so today, but either way, creating a bunch of substrings still isn't cheap. There's also no reason you couldn't use a regex in a parser, but the built-ins specifically avoid that.

## Yeah sure, but what about performance?

I'm glad you asked! [Chevrotain](https://sap.github.io/chevrotain), one of the fastest js parser libraries, has a convenient [benchmark suite](https://sap.github.io/chevrotain/performance/) that lets you compare some of the most well-known js parser libraries available. That benchmark parses a ~1,000 line JSON, seeing how many times per second (or how many thousand lines per second) each parsing library can manage. At the time of writing (2020/03), there's a pretty decent performance gap among the parsers across browsers. Here's how the table breaks down on my system across Firefox and Chromium:

| Parser     | Firefox ops/s | Firefox rank | Chromium ops/s | Chromium rank |
| ---------- | ------------: | -----------: | -------------: | ------------: |
| Handbuilt  | 1,173.80      | 1            | 891.52         | 2             |
| Chevrotain | 842.99        | 2            | 1,342.58       | 1             |
| Myna       | 470.23        | 3            | 178.97         | 8             |
| Parsimmon  | 264.81        | 4            | 266.76         | 4             |
| PEG.js     | 235.68        | 5            | 242.93         | 5             |
| Jison      | 154.29        | 6            | 209.43         | 6             |
| ANTLR4     | 125.77        | 7            | 440.72         | 3             |
| Nearley    | 92.23         | 8            | 205.72         | 7             |

With the usual grain of salt that comes with benchmarks, sprunge when run against the same sample 1,000 times with 5 runs averaged achieves 520.56 ops/s on Firefox and 590.59 ops/s on Chromium, which puts it at 3rd on Firefox and Chromium. It should also be noted that `JSON.parse` absolutely murders all of these parsing libraries, doing something like 6,300 ops/s on Firefox and 10,500 ops/s on Chromium, so you probably don't want to roll your own JSON parser unless you have a _good_ reason. The JSON grammar is a fairly simple, so performance from one library to the next will likely vary considerably from grammar to grammar. I'm also not sure how up to date the libraries in that benchmark are, so there could be significant perormance improvements in any or all of them. Some of the parser generators also have more than one mode, like PEG.js, which has a fast parsing mode and a smaller code mode. It looks like the fast parsing mode is about four times faster than the smaller code mode, and I have no idea which on is used in the benchmark.

The primitive built-in parsers look for a certain character out of a string as a stopping point. The first run of sprunge just used `indexOf` which resulted in about 100% more overhead compared to what it does now, which is to sort the string of characters that serves as the haystack at parser creation and then uses an unrolled loop, a linear search, or a binary search within that string when matching, depending on the length of the string. It's a little funky, but ~250 ops/s is certainly something. The other unusual thing sprunge does is use a common `Failure` instance to indicate that a parser did not succeed. This single array instance prevents tons of allocations, as failure is more common than success when applying parsers. Detailed error messages are also off by default in sprunge, so if parsing fails, you only get a position within the input string at which parsing failed. With detailed error messages enabled, you also get an error message and possibly an array of further causes from something like applying alternates where every one of them failed. Individual parsers are responsible for propagating error information upward depending on the detailed errors flag. The built-in parsers also allow a result array to be passed in, so that each parse attempt doesn't result in an allocation for a result. This allows the same result to be used for every parser, which also eliminates a ton of allocations. The little bit of wackiness with failures and pre-allocated results results in a further 50% performance improvement, most of which is lost by turning detailed errors on (365.65 ops/s on Chromium).

All totaled, without the stuff mentioned in the previous paragraph, sprunge struggled to break 100 ops/s on Firefox and 180 ops/s on Chromium. Oddly, on my phone, a Galaxy s10+, sprunge manages 722.33 ops/s on Brave and 436.83 ops/s on mobile Firefox. I'm not sure if that's due to all the fluff running on my laptop, a Dell XPS 13 i7 9650 running linux, or particularly good optimizations in Samsung's Android spin and the mobile browsers. I also find it comforting that sprunge doesn't take a wild performance hit from running in a different js engine.

## Whatever. What's it look like?

It looks like a parser combinator library. I mean, what did you expect? You have a few parsers, and you combinate them.

Here's a parser that reads a number using the built-ins:

```ts
const digits = '0123456789';
const num: Parser<number> = map(
  seq(
    opt(str('-', '+')),
    read1(digits), opt(str(".")), read(digits),
    map(opt(seq(str('e', 'E'), opt(str('+', '-')), read1(digits))), r => r && r.filter(v => v).join(''))
  ),
  r => +r.filter(v => v).join('')
);
```

Taking that a piece at a time, on line 1, you have the definition of a digit, which could be considered a character class. On line 2, the beginning of a number parser, which is going to apply an inner parser and map its result to a js number using the `+` operator on line 8. The inner parser starting on line 3 is a sequence of inner parsers, starting with an optional sign on line 4. Line 5 uses the `read1` parser to read at least one digit, followed by an optional `.` and zero or more digits. Line 6 will read on optional exponentiation as a string `'e'` or `'E'`, followed by an optional sign, followed by at least one digit, which if all in the sequence are successful, are concatenated into a single string. Note that the `opt` parser always succeeds, so the if the sign parser within it fails, its result will be `null`, which is filtered out in the `map` application. `seq` returns a tuple, which in this case is `[string|null, string, string|null, string, string]`, and the map filters out the false-y values and concatenates what's left while turning it into a number. This parser can handle everything from `0` to `-420` to `0.0099` to `-1412.442E+12`. The great beauty of parser combinators is that you can take that number parser and combine it with other parsers without having to worry about how a number is internally represented. Once the number parser works, it works wherever, and you can take it further to handle things like digit grouping and other radixes like `0x0a` and `0777` without too much trouble.

While we're here, lets go ahead and do the full [PEG.js](https://pegjs.org/online) calculator example.

```ts
const ws = skip(' \t\r\n');
const expr: Parser<number> = {};
const term: Parser<number> = {};
const factor: Parser<number> = {};

expr.parser = map(
  seq(term, rep(seq(ws, str('+', '-'), ws, term))),
  r => r[1].reduce((a, c) => c[1] === '+' ? a + c[3] : a - c[3], r[0])
);

term.parser = map(
  seq(factor, rep(seq(ws, str('*', '/'), ws, factor))),
  r => r[1].reduce((a, c) => c[1] === '*' ? a * c[3] : a / c[3], r[0])
);

factor.parser = alt(
  bracket(seq(ws, str('('), ws), expr, seq(ws, str(')'), ws)),
  num
);
```

Bloody hell, you think that's better than BNF? Yes, yes I do - because - there's much less magic stuff to have to learn beyond the syntax of TS/JS and what the individual parsers and parser generators do. So, taking this one line at a time, on line 1, you have a parser that skips whitespace and produces empty strings. Lines 2 through 4 are lazy parsers that produce numbers. They're lazy because they recursively reference each other, so you can't declare them up front and have a valid reference in the first parser to later parsers. sprunge will take care of extracting the final parser and caching it for speed purposes on the first execution of the parser. Line 6 starts the main parser, the expression, which reads a term, followed by zero or more pairs of `+` or `-` operator and a term. The term parser starts on line 11 and will produce a number if it succeeds. The parsed expression is then mapped to a number by reducing the array of pairs starting with the opening term and applying the parsed operator of the pair to the sum and the parsed operand. The term parser on line 11 reads a factor, followed by zero or more pairs of `*` or `/` operator and a factor, which is defined on line 16 and produces a number if it succeeds. Like the expression parser, the term parser maps its matched pieces into a number by reducing the pairs of operator/operand starting from the opening factor and applying the parsed operator to the accumulator and the parsed operand. Finally, the factor parser on line 16 reads a bracketed expression or a number. This setup starts with the operators of least precedence `+`/`-`, and reads higher precedence operators `*`/`/` on either side if possible. The `*`/`/` operators try to read higher precedence operators on either side as parentesized expressions or, failing that, just numbers. Since each lower precedence operator tries to read a higher precedence operator first, the lower precendence operators can only read the results of the higher precedence operators, which consume the input before the lower precedence operators get to it. That's a slightly weird process if you're not used to looking at it, but it you step through each parser in order, it kinda starts to make sense after a while and some eye crossing.

## Ah, geez. What else?

This is not a streaming parser library, so if you don't have the full input or can't fit it all in memory at the same time, this is not the library you're looking for. I wouldn't try to parse more than a few tens of MB of text, and even that may be pushing it. This library should work fine in node, where you'd be more likely to get away with parsing that much. It's also written to avoid excessive allocations if the underlying JS engine doesn't optimize `substr`s. The theoretical absolute maximum input is 2GB, though I suppose it could go to `MAX_SAFE_INTEGER` if the engine supports it.

This library is written in Typescript and is distributed as a UMD bundle or ES modules. If you use ES modules for your client-side code and bundle with [rollup](https://rollupjs.org), which I strongly recommend, you theoretically won't have to include any parsers that you don't use in your bundle, as this style of assembling parsers is quite treeshakable. Hopefully this will allow a very rich set of parsers to be included in the core library without additional overhead.

There is a minimal test suite in place that covers the basics of the primitive parsers and combinators and supporting tooling. Error messages are available, but are not currently verified in testing, as I'm not positive they've reached their final form. There are also probably several parsers that need to be added before this is useful for more than very simple grammars.

There's also no way to supply any context in a chunk of a parse tree, and I think that could be useful if a bit expensive. Of course, there's nothing stopping you from writing a `context` parser that manages its own stack, but I haven't run into a a usecase that requires that yet for experimentation.

### Why `sprunge`?

Ah, yes. Finally asking the real questions.

Have you ever seen _Futurama_? In the _Bender's Big Score_, there is a race of nudist aliens that have a special organ that detects information called a sprunger. Yep.

## A brief detour into my parser/combinator head canon.

What exactly is a parser, anyways? Well, to me, a parser is function that accepts an input string and produces either a success or a failure. For the purposes of this library, it also takes a position in the input string from which it should start trying to parse. That alone is not particularly useful, but it gives you a solid foundation for the next bit of parser/combinator - the combinating. A combinator is a parser that uses other parsers to parse. It still takes the same input and position and returns the same success or failure, but it does so by delegating to other parsers. It doesn't care if the other parsers also delegate to further parsers, which delegate to further parsers, which delegate to turtles. This allows a few primitive parsers, such as ones that will read certain characters, not read certain characters, or skip certain characters, to be combined to build more complex parsers, such as ones that will read a certain character, possibly followed by a number of other character sequences, finally followed by the initial character. The combinator doesn't care about what its member parsers are doing, only that they tell it whether they succeeded or failed, which is all a parser does anyways. It's so simple even I can follow it.

## Parsers

Here's the list of built-ins for sprunging:

| parser | args | description | fails? |
| ------ | ---- | ----------- | ------ |
| `skip` | `string` | skips any chars in the input, advancing the input position | no |
| `skip1` | `string` | skips at least one char in the input, advancing the input position | yes |
| `read` | `string` | reads any chars in the input, advancing the input position and returning the matched characters as a string | no |
| `read1` | `string` | like `read`, but requires at least one character to match | yes |
| `chars` | count: `number`, allowed?: `string` | reads `count` characters from the input, and will only match characters in `allowed` if it is supplied | yes |
| `notchars` | count: `numbers`, disallowed: `string` | reads `count` characters from the input that are not in `disallowed` | yes |
| `readTo` | stop: `string`, end?: true | reads characters from the input until one in `stop` is reached, and if `end` is true, the end of the input is an acceptable end for a match | yes |
| `read1To` | stop: `string`, end?: `true` | like `readTo`, but must match at least one character | yes |
| `readToDyn` | state: `{ stop: string }`, end?: `true` | like `readTo`, but the target stop characters can change after the parser is created | yes |
| `read1ToDyn` | state: `{ stop: string }`, end?: `true` | like `readToDyn`, but must match at least one character | yes |
| `readToParser` | chars: `string`, parser: `Parser`| reads characters in the input until one of the characters in `chars` is encountered, then tries the given `parser`; if the parser succeeds, the matching string up to that point is returned, otherwise reading continues | no |
| `read1ToParser` | chars: `string`, parser: `Parser`| like `readToParser`, but requires at least one character to match | yes |
| `opt` | `Parser` | if the given parser succeeds, that result will be passed through, otherwise, `opt` will succeed with a `null` result | no |
| `alt` | `...Parser[]` | applies the given parsers in order until one succeeds, and if none succeed, `alt` will fail | yes |
| `verify` | `Parser`, verify function | if the given parser succeeds, its result is passed to the verify function, which can pass or fail the `verify` based on its result - `true` to pass or a `string` to fail | yes |
| `map` | `Parser`, map function, error function | if the given parser succeeds, its result is passed through the given map function for the `map` to return as a success. if the error function is called, the parser fails with the message given to the error function | yes |
| `str` | `...string` | matches one of the given strings exactly | yes |
| `istr` | `...string` | matches one of the given strings case insensitively | yes |
| `seq` | `...Parser[]` | matches the given parsers in order, producing a tuple of the matched results if all of the parsers succeed | yes |
| `not` | `Parser` | matches an empty string only if the given parser fails | yes |
| `andNot` | `Parser, Parser` | matches the first parser only if the second parser fails to match | yes |
| `bracket` | left: `Parser`, content: `Parser`, right: `Parser` | skips the `left` content, matches the `content`, and skips the `right` content to produce the `content` result if all three succeed | yes |
| `bracket` | ends: `Parser[]`, content: `Parser` | skips one of the given `ends`, matches the `content`, and skips the initially matched `ends` parser again to produce the `content` result if all three succeed | yes |
| `check` | `...Parser[]` | like `seq`, but discards the results of the given parsers, always producing a `null` success result if all of the given parsers succeed | yes |
| `rep` | `Parser` | matches the given parser as many times as possible, producing an array of results | no |
| `rep1` | `Parser` | like `rep`, but requires at least one match | yes |
| `repsep` | content: `Parser`, separator: `Parser`, trail?: `'allow'|'disallow'|'require'` | matches the `content` followed by the `separator` as many times as possible - a trailing separator for the last result may be allowed, forbidden, or required as necessary - the default is to allow a trailing separator | no |
| `rep1sep` | content: `Parser`, separator: `Parser`, trail?: `'allow'|'disallow'|'require'` | like `repsep`, but requires at least one match | yes |
| `outer` | parser: `Parser` | Matches a substring in the input from the starting location to the point in the input to which the given parser successfully parses. | yes |
| `debug` | parser: `Parser` | Sets a breakpoint before running the given parser using a `debugger` statement. | yes |

There are also parsers for CSV, keypaths, and a relaxed form of JSON included as modules.

### Building

```sh
# clean out any old build artifacts
npm run clean

# build the library
npm run build

# test the library
npm run test
```

The way testing is set up, it builds the library separately from the main build task, so any time you build the tests, you are also building the main library. The library is built to the `lib` directory, which is git-ignored, and the tests, along with library, are built to the `build` directory, which is also git-ignored.
