# Content Moderation Match Types Explained

The content moderation system supports three different match types for keywords. Each type works differently and is suited for different use cases.

## 1. **Exact Match** (`exact`)

### How it works:
- The **entire text** must match the keyword **exactly** (case-insensitive)
- No partial matches, no word boundaries - it's an exact string comparison

### Examples:

| Keyword | Match Type | Will Block | Won't Block |
|---------|-----------|------------|-------------|
| `"fuck"` | `exact` | ✅ "fuck" | ❌ "fuck you"<br>❌ "go fuck yourself"<br>❌ "fucking" |
| `"hello world"` | `exact` | ✅ "hello world" | ❌ "hello world!"<br>❌ "Hello World"<br>❌ "hello world test" |

### When to use:
- **Rarely used** - Only when you want to block a very specific, exact phrase
- Example: Blocking a specific command or exact quote
- **Not recommended** for most moderation use cases

---

## 2. **Contains Match** (`contains`) ⭐ **MOST COMMON**

### How it works:
- Checks if the keyword appears **anywhere** in the text
- For **single words**: Uses word boundaries (matches whole words only)
- For **phrases**: Checks if all words appear in order (allows other words in between)

### Single Word Examples:

| Keyword | Match Type | Will Block | Won't Block |
|---------|-----------|------------|-------------|
| `"fuck"` | `contains` | ✅ "fuck"<br>✅ "fuck you"<br>✅ "go fuck yourself"<br>✅ "what the fuck" | ❌ "fucking" (unless you also add "fucking" as a keyword)<br>❌ "fucked up" (unless you also add "fucked" as a keyword) |
| `"punch"` | `contains` | ✅ "punch"<br>✅ "I'll punch you"<br>✅ "punch in the face" | ❌ "punching" (unless you also add "punching" as a keyword) |

**Note:** Word boundaries mean it matches whole words. So "fuck" matches in "fuck you" but NOT in "fucking" (unless you add "fucking" as a separate keyword).

### Phrase Examples:

| Keyword | Match Type | Will Block | Won't Block |
|---------|-----------|------------|-------------|
| `"fuck you"` | `contains` | ✅ "fuck you"<br>✅ "fuck you very much"<br>✅ "go fuck you now" | ❌ "fuck" (alone)<br>❌ "you fuck" (wrong order) |
| `"you are ugly"` | `contains` | ✅ "you are ugly"<br>✅ "you are very ugly"<br>✅ "you are so ugly today" | ❌ "ugly you are" (wrong order)<br>❌ "you ugly" (missing "are") |

**Note:** For phrases, common words like "you", "are", "is" are filtered out to prevent false positives. So "you suck" won't match in "what race are you?" because only "suck" needs to match, and it's not present.

### When to use:
- **Most common choice** - Use this for 95% of your keywords
- Single words: Blocks the word in any context
- Phrases: Blocks specific phrases even with words inserted between them
- **Recommended for:** Offensive words, violence, hate speech, bullying phrases

---

## 3. **Regex Match** (`regex`)

### How it works:
- Uses **regular expressions** (regex patterns) for advanced matching
- Most powerful but also most complex
- Can match patterns, variations, and complex rules

### Examples:

| Keyword (Regex Pattern) | Match Type | Will Block | Won't Block |
|-------------------------|-----------|------------|-------------|
| `"f\*+k"` | `regex` | ✅ "fuck"<br>✅ "f**k"<br>✅ "f***k" | ❌ "fork" |
| `"f[u\*]+ck"` | `regex` | ✅ "fuck"<br>✅ "f*ck"<br>✅ "fu*ck" | ❌ "fack" |
| `"kill\s+(yourself|urself|urslf)"` | `regex` | ✅ "kill yourself"<br>✅ "kill urself"<br>✅ "kill urslf" | ❌ "kill you" |

### When to use:
- **Advanced use cases only** - When you need to catch obfuscated words
- Example: Catching "f*ck", "f**k", "f***k" variations
- **Warning:** Regex can be complex and error-prone. Test thoroughly!
- **Not recommended** unless you're comfortable with regex patterns

---

## Quick Decision Guide

### Use **`contains`** when:
- ✅ Blocking offensive words (fuck, shit, etc.)
- ✅ Blocking violence keywords (kill, punch, stab)
- ✅ Blocking phrases ("you are ugly", "fuck you")
- ✅ **This covers 95% of use cases**

### Use **`exact`** when:
- ✅ You need to block a very specific, exact phrase
- ✅ You want to avoid any partial matches
- ⚠️ **Rarely needed**

### Use **`regex`** when:
- ✅ You need to catch obfuscated words (f*ck, f**k)
- ✅ You need complex pattern matching
- ⚠️ **Only if you understand regex**

---

## Best Practices

1. **For offensive words:** Use `contains` with the base word
   - Add: `"fuck"` (contains)
   - Also add variations: `"fucking"`, `"fucked"`, `"fucker"` (if needed)

2. **For phrases:** Use `contains` with the phrase
   - Add: `"fuck you"` (contains)
   - This catches "fuck you", "go fuck you", "fuck you very much"

3. **For obfuscation:** Use `regex` for patterns
   - Add: `"f[u\*]+ck"` (regex) to catch "fuck", "f*ck", "fu*ck"

4. **Test in Content Checker:** Always test your keywords in the Admin Content Checker before relying on them!

---

## Common Mistakes

❌ **Using `exact` for single words**
- `"fuck"` (exact) won't block "fuck you"
- ✅ Use `"fuck"` (contains) instead

❌ **Not adding variations**
- `"fuck"` (contains) won't block "fucking"
- ✅ Add both `"fuck"` and `"fucking"` as separate keywords

❌ **Using `regex` when `contains` works**
- Overcomplicates things
- ✅ Use `contains` unless you really need regex patterns

---

## Summary Table

| Match Type | Complexity | Flexibility | Use Case | Recommendation |
|------------|-----------|-------------|----------|----------------|
| `exact` | ⭐ Simple | ❌ Very limited | Exact phrases only | ⚠️ Rarely use |
| `contains` | ⭐⭐ Moderate | ✅ Good | Most keywords/phrases | ✅ **Use this 95% of the time** |
| `regex` | ⭐⭐⭐ Complex | ✅✅ Very flexible | Advanced patterns | ⚠️ Use only when needed |

