# Dust Tutorial

* Richard Ragan - PayPal ( Author )
* Veena Basavaraj - LinkedIn ( Edits )
* Denis Rechkunov - Catberry ( Edits )

## Show me some Dust

A quick sample is often the best way to get a general sense of something. 
In that vein, here is a simple Dust template and it's JSON data below it

Template: 
```
{title}
<ul>
{#names}
	<li>{name}</li>{~n}
{/names}
</ul>
```

JSON:
```json
{
	"title": "Famous People", 
	"names" : [
		{ "name": "Larry" },
		{ "name": "Curly" },
		{ "name": "Moe" }
	]
}
```

This will output: 
```html
Famous People 
<ul>
	<li>Larry</li>
	<li>Curly</li>
	<li>Moe</li>
</ul>
```

Dust templates output plain old text and processes dust tags &ndash; `{xxxxxx}` 
being a dust tag format. The tag structure is similar to html in general form 
but using braces instead of `<>`, e.g. `{name /}`, `{name}body inside tag{/name}` 
and with parameters `{name param="val1" param2="val",... }`.

The simplest form is just `{name}` and is called a key. It references a value 
from the JSON data named `name`. In our example, you saw the key `{title}` which 
produced an output value of `Famous People`. The other tag form we saw in the 
example was `{#names}....{/names}`. This is called a section. 

* If the property is an array, it finds the "names" property from the JSON 
model and iterates over 1 to n times where n is the number of array elements. 
In our example, we looped over the three "name" values in the JSON model 
using the `{name}` key in the section body.
* If the property exists and is a non-empty scalar, the section outputs the 
value of the scalar provided it is referenced in the body
* If the property exists and is a valid object, the section outputs properties 
in the object if referenced by keys of the form `{object.propName}`
* If the property does not exist or has an empty array, nothing from the body 
of the section is emitted.

### More on Dust Output and Dust Filters

Things worth knowing:

* If there is no value found for a key, nothing is output
* Template whitespace is largely discarded. Take special care if you have a 
JavaScript code block and have comments of the form `// message`. When all the 
newlines are removed, this will comment out the following statement. 
Use the `/* message */` form instead.
* `{! Comment syntax !}` is how you write comments
* ```{`   Preserve all new lines, whitespace, and braces `}```
* All output values are escaped to avoid Cross Site Scripting (XSS) unless you 
use filters: 
  * Hello `{name|s}` suppresses auto-escaping (removes default filter)
  * Hello `{name|h}` force HTML escaping (by default if you do not specify 
any filters)
  * Hello `{name|j}` force JavaScript escaping
  * Hello `{name|u}` encodes with JS native encodeURI
  * Hello `{name|uc}` encodes with JS native encodeURIComponent
  * Hello `{name|js}` stringify JSON literal
  * Hello `{name|jp}` parse JSON string to object
* Filters can be chained &ndash; `Hello {name|s|h}`
* Special characters can be escaped if you need to output them: 
  * `{~n}` &ndash; newline
  * `{~r}` &ndash; CR
  * `{~lb}` &ndash; left bracket
  * `{~rb}` &ndash; right bracket 
  * `{~s}` &ndash; space

You can register your own filters using 
`dust.filterManager.add(name, filter)`/`dust.filterManager.remove(name)`.
Filter is just a `function (value) { return value.replace(...); }`

## Dust Data and Referencing

Dust gets its data values from the JavaScript object literal used to render the 
template. Object literals contain three main types of data: scalars 
`(name: xxx}`, arrays: `["aa", "bb", "cc"]` 
and objects `{name: {firstName: "Jane", lastName: "Doe" }}`. The data can also 
be a function but we are not considering that case here.

Referencing a scalar value is done with a simple key, e.g. `{name}`. Individual 
array elements can be referenced by subscripting, e.g. `array[3]`. Object 
properties are referenced using paths, e.g `name.firstName`.  Of course, a path 
reference can be to a scalar or an array which could then be subscripted.

## Sections
A section is a Dust tag of the form `{#names}...{/names}`. It is the way you 
loop over data in Dust.  What happens is the current context 
(more on context shortly) is set to the `names` part of your JSON data. If names 
is an array, the body wrapped by the section tag is executed for each element 
of the array. If the element is not an array, the body will just be executed 
once. If the `names` element does not exist or is empty, the body will be 
skipped.

During the execution of the section iteration, two variables are defined:
 
* `$idx` - the index of the current iteration starting with zero
* `$len` - the number of elements in the data being iterated

Note: `$idx` and `$len` work for arrays of primitive types.

## Sections and Context

So if I have two instances of name: value in my JSON, how does Dust decide 
which one to use to render `{name}`?

Dust has a concept of context to provide rules around how a value is found in 
the JSON model. When you use a section reference like `{#name}....{/name}` Dust 
sets it's context to the portion of the JSON model identified by name. When you 
first start rendering, the context is set to the outermost level of the JSON 
object. Thus the `{#names}` section positions the context to the block of JSON 
in the names: `[...]` part, which happens to be an array. Therefore, the 
`{name}` key in the section body is matched against the one in the 
context `names`.

Let's explore how context works with a more complex JSON model.

```json
{
	"name": "root",
	"anotherName": "root2",
	"A": {
		"name":"Albert",
		"B": {
			"name":"Bob"
		}
	}
}
```

As we learned earlier, if you have `{#A}{name}{/A}` the current context is `A:` 
and everything under it (i.e. it includes the `B:` stuff). The key for `{name}` 
will output `Albert` because that is the direct value of name in the 
context of `A`.

So how does it work if you have `{#A}{anotherName}{/A}`? You will get `root2` 
as the output. That's because `anotherName` could not be found directly under 
`A` so Dust tries to walk up to the parent of `A` (which is the root context 
in our case) and finds `anotherName` hence using its value. In general, a 
simple key reference will look first in the current context and, if not 
found, search all higher levels up to the root looking for the name. It will 
not search downward into things like `B` that are nested within `A`.

## Paths

Suppose our context is the root and say we want to work with the data "only" 
under `B`. Like in JavaScript itself, you can use a dotted notation called a 
"path" to do this. For example, `{A.B.name}` will output `Bob`.

Simple key references like `{A.B.name}` are sometimes not enough. You might 
need to use a section to iterate over a sub-part of the JSON model. Remember 
when you use `{#xxxx}` for a section, you also establish a new context at 
that point. For example, in the case of `{#A.B}{name}{/A.B}`, This will output 
`Bob` because our context has been set to B within A. Path notation only allows 
you to reference a path visible within the current context.

You CANNOT reference a value using paths when that pathed value is outside your 
current context.
Lets look at an example to make this point clear.
```
{#A.B}
	name in B={name} name in A= {A.name} 
{/A.B}
```

The above will output `name in B=Bob name in A=` showing that `A.name` is not 
accessible inside the context `A.B`. What goes on is that dust looks for the 
initial part of the path in the current context, e.g. A, and gives up when it 
cannot find it. 

There is a way out of this behavior. Follow along with the below dust fragment. 
`{#A}`, is a non-pathed reference so it is allowed to search upward and 
find `A`.  Then `{#A}` sets a new context to `A` allowing us to reference the 
`name` value under `A`. When the closing tag `{/A}` is reached, the context 
reverts to `{#A.B}`, Yes, the context acts like a stack.

**IMPORTANT**: While you cannot use a dotted path notation to reference 
ancestor/parents JSON from the current context, you can use a 
non-pathed section reference to adjust your context to a higher point. 
For example:

```
{#A.B} name in B={name} 
	{#A} 
		name in A: {name} 
	{/A} 
{/A.B}
```

Another way to reference a value outside your current context is to pass 
the value into the section as an inline parameter 
(we will talk more about parameters soon). Here is an example of how to access 
`A.name` within the `{#A.B}` context using a parameter on the `{#A.B}` section

```
{#A.B param=A.name} 
	name in B={name} name in A: {param} 
{/A.B}
```

### New path behavior available as of dust 2.0.0 release
A change to the limitation of dust paths not searching outside the current 
context was made in the 2.0.0 release. Note that there is a very slight 
possible incompatibility which we will discuss in a bit. 

So what does the change do? If you look at the example above 
(using the same data):
```
{#A.B}
	name in B={name} name in A={A.name} 
{/A.B}
```

with this path change it will output `name in B=Bob name in A=Albert`. The new 
rules for resolving path references are as follows:

* If the path is `{x.y.z}` and `x` is not in the current context, begin looking 
in outer contexts for `x`. If found, look from there for `y.z`. If found, 
return the value. If not found, give up and return no value. Do not look further.
* If the path is `{x.y.z}` and `x` is not found in any context, then look for 
the path in globals similar to the way simple key references look in globals 
as a final search location. The difference is that paths can now be found in 
globals.

Some things remain unchanged from the original dust:
* If the path starts with a period, e.g. `{.x.y.z}`, the search remains 
restricted to the current context.
* If the path is `{x.y.z}` and the entire path can be found in the current 
context, the value of the path will be used.
* If an explicit context (covered in next section) is established by 
`{name:context}`, then only the context determined by name and that provided 
by `:context` are visible. You cannot escape out of these two contexts and 
reference anything further up the stack. This is like the original dust.

This change eliminates the need for using a `{#x}` sort of hack to reach 
a path that is in an outer context.

For those wondering about compatibility implications, they should be slight. 
The two main cases are:

* A path reference that used to return no value, might start returning a value 
if the path can be found in an outer context of the data. The fix is to 
prefix the path with a period to constrain the search to the current context.
* The code might test for the existence of data using a path to determine 
whether to output some conditional text. Presence or absence of the path in 
the data used to control this behavior. Now if the path is omitted but it 
can be found in outer context, the output that used to be omitted will 
start appearing. Like the previous case, the different output relies on 
the path actually appearing somewhere in an outer context. As in the first case,
adding a leading period will constrain the search to just the current context 
restoring the old behavior.

## Explicit context setting
Normally the visibility of data from the JSON model is controlled by your 
current context set by the `#` tag, or by inline parameters, plus the ability 
to access values by the key reference `{name}` and to reset the current context 
based on a `#section` reference to outer block using `{#outerBlock}`. 

There is another way to control and limit visibility for a block of code. 
The notation `{#name:name2}.... {/name}` will do that.

Specifically it does the following:

* Hides all nested context levels above `name`
* Puts `name2` data as the parent context and name as the current context

This prevents `{key}` references from accessing any data not in the 
`name` or `name2` contexts. No further reaching up can happen even with simple 
key forms like `{name}`. This scope limitation might be useful for data 
hiding from components. Another use for it could be to make only the current 
context and it's peer available. 

Given a data model where `A` and `B` are peers and we need to iterate over `A` 
and also reference data from `B`, without explicit context setting we would 
have trouble doing this. 
```json
{
	"A": {
		"names": ["Albert", "Alan"]
	},
	"A2":{
		"type": "Student"
	}
}
```
However, the following:
```
{#A:A2} {#names}{.} - {type} {/names} {/A}
```

will output `Albert - Student Alan - Student` since both `A` and `A2` are on 
the context stack even though `A2` would not normally be there.

## Sections with parameters

Since we just dropped a teaser about parameters, let's look at them. 
Section tags allow you to pass parameters into the section for subsequent use. 
Parameter values can be simple string constants or the name of a value from the 
data model. For example, using the same data model as earlier:
```
{#A.B foo="Hi" bar=" Good to see you"}
	{foo} {name} {bar}
{/A.B}
```

This will output `Hi Bob Good to see you`

As we saw earlier, values from the data model can also be passed. Consider

```
{#A.B foo=A.name bar=anotherName}
	{foo} {name} {bar}
{/A.B}
```

This will output `Albert Bob root2`. It's important to understand the context 
at the point the parameter values are established. With `foo=A.name` above, 
`A.name` is evaluated before the context is moved to `A.B`, thus `A.name` 
is accessible.

However, if the parameter values are interpolated into strings, they are 
evaluated in the context of the section using them. Therefore, the following 
will just output `Bob root2` because `{A.name}` is not accessible from the 
`{#A.B}` context.

```
{#A.B foo="{A.name}" bar="{anotherName}" }
	{foo} {name} {bar}
{/A.B}
```

While you can specify an object as a parameter, e.g.
```
{#A.B foo=A }
	{foo.name}
{/A.B}
```

you cannot do anything useful with it since the `{foo.name}` reference is 
going to look for foo in the current context but that context is the element of 
the current iteration of the section `#A.B` (in this case just the name: 
`Bob`, value). Therefore, `foo` won't be found. The foo parameter is on the 
context stack but one level higher than the current element iteration so 
unreachable by a path reference.

When deciding on parameter names, try to be unique. Inline parameters will 
not override the current context if a property of the same name exists. 
Let's look at an example:

```
{#A name="Not Albert"} 
	name is {name}.
{/A}
```

will output `name is Albert` since preference goes to data in the current 
context followed by inline parameters then up the context tree.

If we want to be sure we get the value in the parameter we can make it unique.
```
{#A paramName="Not Albert"} 
	name is {paramName} and {B.name} is still Bob.
{/A}
```
will output `name is Not Albert and Bob is still Bob` 

## Parameter rules
Since parameters are on your mind, let's discuss the three forms parameters 
can take.

* `param=name`
* `param="xxx"`
* `param="{yyy}"`

In the first form, name is obtained from the context. It can be a path. 
In the second form, the value looks like a string and is, in fact, a 
string value. In the third form the value for the name `yyy` is obtained from 
the context and interpolated into the string resulting in a string value.

One more subtle nuance is when the value of the parameter is determined. 
With the first form `param=name`, value of name is obtained from the context 
before the section (or partial or helper) is processed/invoked. Ditto for 
the second form which is a string constant. The third form is the tricky one. 
Dust only evaluates the interpolated string within the section/partial/helper. 
Mostly this does not matter but if a new value for `yyy` is added to the 
context stack via another param of the same section/partial/helper 
(i.e. `{#A.B param="{yyy}" yyy="baz"}`),  that value will be found and used 
rather than the one known at the point of call. Be careful naming parameters 
the same as data you are referencing from the context.

## Logic in Templates
Templates with logic versus "logic-less" templates is a hotly debated point 
among template language designer and users. Dust straddles the divide by 
adopting a "less logic" stance. We all know that real business logic does 
not belong in the presentation layer, but what about simple 
presentation-oriented things like coloring alternate rows in table or 
marking the selected option in a `<select>` dropdown? It seems equally wrong 
to ask the controller/business logic code to compute these down to simple 
booleans in order to reduce the logic in the presentation template. This route 
just lead to polluting the business layer code with presentation-oriented logic.

Dust provides some simple logic mechanisms and trusts you to be sensible in 
minimizing the logic in your templates to only deal with presentation-oriented 
decisions. That said, let's take a look at the ways Dust let's you have logic.

There are two other special section notations that provide conditional testing:

* `{?name} body {/name}` not only tests the *existence* of name in the 
current context, but also evaluates the value of name in the JSON model. 
If name is "true" (see below for what true means), the body is processed.
* `{^name} body {/name}` not only tests the *non-existence* of name in 
the current context, but also evaluates the value of name in the JSON model. 
If name is not true (see below for what true means), the body is processed.

Note that the value of name is evaluated as follows:
* `""` or `' '` will evaluate to `false`, boolean `false` will evaluate to 
`false` as well, `null`, or `undefined` will evaluate to `false`. 
* Numeric `0` evaluates to `true`, so does, string `"0"`, string `"null"`, 
string `"undefined"` and string `"false"`. 
* Empty array -> `[]` is evaluated to `false` and empty object -> `{}` and 
non-empty object are evaluated to `true`.

Here is an example of doing something special when the array is empty.

Template:
```
<ul>
{#friends}
	<li>{name}, {age}{~n}</li>
{:else}
	<p>You have no friends!</p>
{/friends}
</ul>
```

JSON:

```json
{
	"friends": [
		{ "name": "Moe", age: 37 },
		{ "name": "Larry", age: 39 },
		{ "name": "Curly", age: 35 }
	]
}
```

This renders html as expected:
```html
<ul>
	<li>Moe, 37</li>
	<li>Larry, 39</li>
	<li>Curly, 35</li>
</ul>
```

If we change the friends array to be empty, the `{:else}` block is triggered
```json
{
	"friends": [ ]
}
```

In the original dust, it does not trigger the `{:else}` block. Our version 
fixed it, to keep `#` and `?` consistent

Take special care if you are trying to pass a boolean parameter. `param=true` 
and `param=false` do not pass `true`/`false` as you might expect. They are 
treated as references to variables named `true` and `false`. Unlike JavaScript, 
they are not reserved names. Note that they are not reserved in JSON either so 
you can have a property named `true` or `false`. So you might think to pass `0` 
and `1` to your boolean-like parameter. That won't work either. dust's boolean 
testing `{?xxx}` is more of an existence test than a boolean test. Therefore, 
with `param=1` and `param=0` both value exists and so are considered `true`. 
Your best bet is to pass `1` and `""`, e.g. `param=1` or `param=""`. You could 
also leave off `param=""` if you are sure the name is not elsewhere in your 
JSON data and accessible. 

## Partials

A Dust template named `xxx` is authored in a file named `xxx.dust`. You can 
have multiple `.dust` files and reference one Dust template as part of another 
one. This is the basis for "components or reusable templates for tasks like a 
common header and footer on multiple pages. Note that the `.dust` file 
extension is used here in examples but .tl is also commonly seen. Since it 
only matters to the build process you can use whatever extension works for you. 

Let's peek under the covers to see how the Dust template rendering knows 
about a template. As we said earlier, Dust templates are compiled to JavaScript. 
```
{>header /}
	... template for the body of the page...
{>footer  /}
```

As long as the JavaScript for the `header.dust` and `footer.dust` templates 
is loaded and registered prior to executing this template, it will run the 
header template, then its own body view and finally the footer template.

Like sections, partials accept parameters so you can build reusable components 
that are parameterizable easily. This gives you the same foundation for 
building libraries as other languages. By passing all the data into the partial 
using parameters, you isolate the partial from any dependence on the context 
when it is invoked. So you might have things like `{>header mode="classic" /}` 
to control the header behavior.

Just like in sections, inline parameters will not override the current context 
if a property of the same name exists. For example, if the current context 
already has `{name: "Albert"}` adding name as a parameter will not override 
the value when used inside the partial foo. 
```
{>foo name="will not override Albert"/} 
```

For dust users of versions prior to 2.0.0, if you use parameters to pass 
an object like:

```json
{
	"homeAddress": {
		"street": "1 Main St",
		"city": "Anytown"
	}
}
```

```
{>displayAddress address=homeAddress /}
```

then you will not be able to reference 
`{address.street}` or `{address.city}` in the body of the partial. 
These get treated as a path reference and the params are higher in the context 
stack at the point of reference so cannot be found. You need to code such 
things as:

```
{#address}
	{street} {city}
{/address}
```

From dust 2.0.0 on, you can write the more natural

```
{address.street} {address.city}
```

### Dynamic Partials for Logic
Note that you can also use dynamic partials, that conditionally select the 
partial to render based on the value in the JSON.

```
{>"flowView{flowName}" /}
```

This sort of usage might suit a case where you have a multi-page flow and 
the controller could pass `page1`, `page2`,... in the data model to dynamically 
choose which partial to use to implement the view.

## Helpers
There are a lot of helpers that are built in Dust.

### Logic Helpers

#### `{@select key="xxx"}` + `@eq`, `@ne`, `@lt`, `@lte`, `@gt`, `@gte`, `@default`

Select provides a key value that can be tested within its scope to output 
desired values. It mimics the switch/case statement. Here are some examples:
```
{@select key=\"{foo}\"}
	{@eq value=\"bar\"}foobar{/eq}
	{@eq value=\"baz\"}foobaz{/eq}
	{@default} - default Text{/default}
{/select}
{@select key=foo}
	{@gte value=5}foobar{/gte}
{/select}
```

Each test condition is executed and if `true`, the body is output and all 
subsequent conditions are skipped. If no test condition has been met and 
a `@default` is encountered, it will be executed and the select process 
terminates.

The `@eq` (for example) can be used without a `{@select}`.The most common 
pattern of usage would be for an HTML `<select>`/`<option>` list to mark the 
selected element with a `selected` attribute. The code for that looks like 
this where `{#options}` is an array of options from the data model. 
Here the key is directly on the eq rather than on the select helper.
```
<select name="courses">
	{#options}
		<option value="{value}"{@eq key=value value=courseName} selected="true"{/eq} >{label}</option>
	{/options}
</select>
```

Similarly, `{@ne}`, `{@lt}`, `{@gt}`, `{@lte}`, `{@gte}` can be used 
standalone and allow nesting. The following is a valid example

```
{@eq key="CS201" value=courseName}
	{@eq key="CS101" value=prereq}
		print it is CS201 course and has CS 101 as prereq 
	{/eq}
{/eq}
```

Note that all of `{@eq}`, `{@ne}`, `{@lt}`, `{@gt}`, `{@lte}`, `{@gte}` 
support an else block so you can output an alternative result if the test 
is `false`.

```
{@eq key="CS201" value=courseName}
	You are enrolled in CS201
{:else} 
	You are not enrolled in CS201
{/eq}
```

#### `{@math}` - math helper
The math helper provides simple computational capabilities. Operations 
supported are: add, subtract, multiply, divide, mod, abs, floor, and ceil. 
The general syntax is:
```
{@math key="operand1" method="mathOpName" operand="operand2" /}
```
The helper computes a result using the key, method, and operand values. 
Some examples will clarify:

* `{@math key="16" method="add" operand="4"/}` - Result will be 20
* `{@math key="16.5" method="floor"/}` - Result will be 16
* `{@math key="16.5" method="ceil"/}` - Result will be 17
* `{@math key="-8" method="abs"/}` - Result will be 8
* `{@math key="{$idx}" method="mod" operand="2"/}` - Return 0 or 1 according to $idx value

#### `@math` with bodies
Sometimes you need to choose something to output based on the result of a 
math helper computation. For example, if the table row number is odd, 
you want to give it a gray background. 
```
{#rows}
<tr class="
	{@math key=$idx method="mod" operand=2}
		{@eq value=0}
			even
		{:else}
			odd
		{/eq}
	{/math}
">
{/rows}
```

The above evaluates the mod  with the given key and operand i.e `$idx % 2` 
and then checks if the output is `0`, and prints the block inside the `@eq` 
helper, if not the else block. Be careful to use numeric values for tests and 
not strings, e.g. `{eq value="0"}` will never be true.

Another example

```
{@math key="13" method="add" operand="12"}
	{@gt value=123}
		13 + 12 > 123
	{/gt}
	{@default}
		Math is fun
	{/default}
{/math}
```

Using the nested `@eq` `@lt` etc. syntax allows you to output values like a 
select/case similar to the select helper.

#### `{@if cond="condition"}` - if helper

There are a few cases where a simple true/false or exists/non-exists or 
single eq or lt or gt test won't suffice. For those, there is the if helper. 

Some examples
```
{@if cond="{x} < {y} && {b} == {c} && '{e}'.length || '{f}'.length"}
	<div> x is less than y and b == c and either e or f exists in the output </div> 
{/if}

{@if cond="({x} < {y}) || ({x} < 3)"} <div> x<y or x<3 {/if}

{@if cond="{x} < {y} && {b} == {c} && '{e}'.length || '{f}'.length "}
	<div>  x is less than y and b == c and either e or f exists in the output </div> 
{:else}
	<div> x is >= y </div>
{/if}
```

Caveat #1: In the above example, if there is a possibility of undefined or 
false value for the `{x}` or `{y}` in the JSON, the correct syntax would be 
to check it exists and then check for `{x} > {y}`. This is a known limitation 
since, `{x}` returns nothing when the value of `x` is `undefined` or `false` 
and thus results in invalid js condition in the if helper

```
{@if cond="'{x}'.length && '{y}.length && {x} < {y} && {b} == {c} && '{e}'.length > 0 || '{f}'.length > 0 "}
	<div> x is less than y and b == c and either e or f exists in the output </div> 
{/if}
```

Caveat #2:  The if helper internally uses javascript `eval`, for complex 
expression evaluation. Excessive usage of if may lead to sub-optimal 
performance with rendering, since `eval` is known to be slow. 

### Other Helpers

Dust provides a mechanism to extend the capabilities of the templating 
solution. Currently there is a small set of helpers that come with the release:
#### `{@sep}` - Separator helper

When outputting lists of things, you often need to do something different for 
the last iteration. Consider the case
```
My friends are: 
{#friends}
	{name},
{/friends}
```

As written this will produce `Hurley,Kate,Sawyer,Desmond,` leading to the 
"dangling comma problem". This can be fixed by using the `{@sep}` helper tag 
as follows:
```
My friends are: 
{#friends}
	{name}{@sep},{/sep}
{/friends}
```

The `{@sep}` helper tag will output it's body content unless this is the 
final iteration of the containing loop.
#### `{@idx}` - Index helper

The `idx` helper tag provides a way to get the index of the current iteration. 
The need for this has been eliminated by the introduction of `{$idx}`.

For example,
```
My friends are: 
{#friends}
	<option value="id_{@idx}{.}{/idx}">{name}</option>
{/friends}
```

Here we are using `idx` to generate a unique id for each option tag in a 
dropdown. Therefore, we would have `id_0`, `id_1`,... for id values. Within 
the `idx` helper `{.}` references the current iteration count.

#### `{@size key="xxx" }` - size helper
The size helper computes the size of the key parameter. The size computed 
depends on the type of the subject parameter as follows:

* `Array` - number of elements,  `[1,2,3,4]` has `size=4`
* `String` - length of the string, `"abcdef"` has `size=6`
* `Object` - Number of properties in the object, `{a:4, b:8, c:15, d:16}` 
has `size=4`
* `Number` - Value of the number,  `23` has size `23` and `3.14` has size `3.14`
* `undefined` - `0`, `""`- 0
* Any other value - length after conversion to string

#### `{@contextDump key="current|full" to="output|console"/}` - contextDump helper
The contextDump helper outputs the current context portion of the JSON data 
model to the output stream. This can help with debugging if you suspect the 
context data is not as expected or you aren't sure what the current context is. 
If you want to change the defaults of `key="current"` and `to="output"`, use 
the parameters. Remove this tag when done debugging.

## Blocks and Inline Partials
An important need in developing a multi-page web application is to have 
common elements of the pages defined just once and shared by all pages 
(Don't Repeat Yourself). Dust provides this with the concept of blocks. 
Consider a common case where several pages share a header and footer but 
have different body content.

Blocks in the base template can contain default content and a child template 
can override that content. A block tag has the form 
`{+name}default Content{/name}`. In the following example, the base 
template has three blocks: `pageHeader`, `bodyContent`, and `pageFooter`. 
The `pageHeader` and `pageFooter` have default content that is shown 
if the child template does not override them.

Base template
```
<div class="page">
	<h1>{+pageHeader}PayPal{/pageHeader}</h1>
	<div class="bodyContent">
		{+bodyContent/}
	</div>
	<div class="footer">
		{+pageFooter}
			<hr>
			<a href="/contactUs">Contact Us</a>
		{/pageFooter}
	</div>
</div>
```

Now that we have defined a base template with named blocks `pageHeader`, 
`bodyContent`, `pageFooter`, let's look at how a child template can use it to 
supply body content and override the `pageFooter`. First, you insert the 
base template as a partial. Then you use one or more "inline partials" defining 
the values for the named blocks in the template.

Child template
```
{! First, insert the base template as a partial !}
{>"shared/base_template"/}

{! Then populate the base template named blocks. Supply the desired bodyContent and pageFooter !}
{<bodyContent}
<p>These are your current settings:</p>
<ul>
	<li>xxxx</li>
	<li>yyy</li>
</ul>
{/bodyContent}
{<pageFooter}
	<hr>
	<a href="/contactUs">About Us</a> |
	<a href="/contactUs">Contact Us</a>
{/pageFooter}
```

Note that inline partials like `{<name}xxx{/name}`, define `name` globally 
within the template. While this might be useful, remember the pains caused 
by global variables in JavaScript and use these with the knowledge that others 
can stomp on your chosen name inadvertently.

## Dust under the covers
Here we take a look at what goes on to actually run a dust template behind 
the scenes. Typically, your framework or environment is taking care of 
this for you. If not, then you need to know how to do it.

=== Compiling a Dust template ===
Assuming you have the dust compiler in your JS environment, you can compile 
a Dust template source file to a JavaScript form. The following will compile 
our very simple template `"Hello {name}!"` to a JavaScript string.

```javascript
var dust = new Dust(),
	compiled = dust.templateManager.compile('Hello {name}!');
```

Now you can register compiled template at server or in browser with name 
`intro` just like this:

```javascript
var dust = new Dust();
dust.templateManager.registerCompiled('intro', 'Hello {name}!');
```

### Running a Dust Template
Assuming you have the `intro` template we previously compiled and registered, 
you can run it using the code below. The first argument to `dust.render` is 
the registered template name, the second argument is the JSON model. 
`dust.render` returns a [Promise](promisejs.org) for rendered content. 

```javascript
dust.render('intro', {name: 'Fred'})
	.then(function (out) {
  		console.log(out);
	}, function (error) {
		console.error(error);
	});
```

### Debugging a Dust Template
In addition to the `contextDump` helper, dust can use logger specified in its
constructor like this:

```javascript
var logger = {
	warn: function (message) { console.log(message); },
	error: function (error) { console.error(error); }
};
var dust = new Dust(logger);
```

Logger is optional and should have only two methods `warn` and `error`.

### Writing a dust helper

Dust helpers are javascript functions registered with the `dust.helperManager`.
You can add/remove your own helpers using 
`dust.helperManager.add(name, helper)`/`dust.helperManager.remove(name)`.

Thus the general form of a helper is:
```javascript
function(chunk, context, bodies, params) {
	code of the helper
}
```

As far as the parameters go:
* `chunk` is the currently accumulating output of the template render process. 
You will most likely contribute additional output as part of your helper. 
* `context` is the current context stack (e.g that which changes when you 
do things like `{#list}`
* `bodies` holds any body sections nested within the helper. 
For example, the `{:else)` body.
* `params` is an object that holds all the parameters used when calling 
the custom helper

Here is a sample custom helper that implements a substring capability. 

`{@substr str="xxx" begin="x" end="y" len="z" /}`

* `begin` is optional, zero if omitted
* `end` and len are choices with `len` taking priority if the 
user supplies both.
* If `len` is present, `str.substr(begin, len)` is used for the result.
* If `end` is present, `str.slice(begin, end)` is used for the result
* If `end` and `len` are both missing then you get the whole 
string back (e.g. `str.substr(0)`).

The annotated code to implement it is:
```javascript
var substrHelper = function (chunk, ctx, bodies, params) {
	// Get the values of all the parameters. The tap function takes care of resolving any variable references
	// used in parameters (e.g. param="{name}"
	var str = ctx.tap(params.str, chunk),
		begin = ctx.tap(params.begin, chunk),
		end = ctx.tap(params.end, chunk),
		len = ctx.tap(params.len, chunk);
	begin = begin || 0; // Default begin to zero if omitted
	// Use JavaScript substr if len is supplied.
	// Helpers need to return some value using chunk. Here we write the substring into chunk.
	// If you have nothing to output, just return chunk.write("");
	if (!(typeof(len) === 'undefined')) {
		return chunk.write(str.substr(begin, len));
	}
	if (!(typeof(end) === 'undefined')) {
		return chunk.write(str.slice(begin, end));
	}
	return chunk.write(str);
};

dust.helperManager.add('substr', substrHelper); // registering helper
```

Parameters can come in many forms, e.g. `param=2`, `param={a}`, `param="{a}"`. 
Some can be accessed and used directly from the params parameter to the helper. 
Others require evaluating a function to obtain the final value. You can avoid 
all the bother around this by using ctx.tap(params.name, chunk) which returns 
you the final value of the parameter.

If you need to work with the body of the helper, then the following will get 
it for you.
```javascript
var body = bodies.block;
```
To evaluate the body, you call it with `body(chunk, context)`. There are other 
parameters if you intend to emulate a looping structure like a section letting 
you define `$idx` and `$len`.

`context` is the dust context stack. Normally you will just use the dust 
get method when retrieving values from the context stack. If you need a 
deeper knowledge, take a look at the code for `Context.prototype.get`. 
Prior to dust 2.1.0, `getPath` was used for references to paths. 
With dust 2.1.0, that capability has been incorporated into `get`.

Generally, you should always return the output of your helper as a 
`chunk` using the `write` method on it to add your helper's generated 
output to the accumulation in the `chunk`. Dust chains the result of your 
helper to further actions which expect to be able to add to the `chunk`. 

## External Support for dust usage
* emacs major-mode for editing html templates is compatible with dust: http://web-mode.org/
* Dust plugin in JetBrains WebStorm

## Loading dust in the browser
This fork of dust is optimized for usage with [Catberry Framework](https://github.com/catberry/catberry).
If you want to use it without Catberry it is highly recommended to write your
code in [node modules](http://nodejs.org/api/modules.html#modules_modules) and then [browserify](http://browserify.org/) it.

## Difference from LinkedIn fork
* All code base is optimized for 
[Catberry Framework](https://github.com/catberry/catberry) and [browserify](http://browserify.org/)
* All components organized via [node modules](http://nodejs.org/api/modules.html#modules_modules)
* Dust is a constructor now. You should create an instance to use it. 
No global variables anymore. 
* It has TemplateProvider and Service Locator registration for [Catberry Framework](https://github.com/catberry/catberry)
* There are no ECMAScript 5 shims like indexOf and JSON
* There is no stream and compiler in browser
* Stream is based on node.js [Readable](http://nodejs.org/api/stream.html#stream_class_stream_readable)
* Helpers are built-in
* Removed `tap` helper, use `context.tap` in helpers instead
* You can add helpers via `dust.helperManager.add('helperName', helper)`
* You can add filters via `dust.filterManager.add('filterName', filter)`
* You can register and compile templates via 
`dust.templateManager.compile(source)` and
`dust.templateManager.registerCompiled(name, compiled)`
* By default `h` filter is applied to value, if you specify any filter(s) 
it will not apply `h` filter after your filters 
* Improved logging, removed many redundant messages
* Compiled templates do not use global variable `dust`
* Removed redundant pragmas such as `{%esc:s}` from Dust grammar
* Method `dust.render` returns a `Promise`