/**
 * This file is part of Jumbo framework for Node.js
 * Written by Roman Jámbor ©
 */

const TAG_REGEXP = /<\/?(\w+)(?:(?:\s+\w+(?:\s*=\s*(?:".*?"|'.*?'|[\^'">\s]+))?)+\s*|\s*)(\/?)>/;
const TAG_NAME_REGEX = /^<([a-zA-Z]+)/;

function findNextTag(input)
{
	return input.match(TAG_REGEXP);
}

/**
 * Match HTML string from first tag in input to it's closing tag.
 * @param {string} input
 * @returns {string}
 */
export function matchToClosingTag(input: string): string
{
	// There should be additional check for nonpaire tags
	// var unpairedObj = { "wbr": true, "p": true, "br": true, "hr": true, "li": true, "img": true, "area": true, "tr": true, "td": true, "th": true, "col": true, "colgroup": true, "source": true, "track": true, "frame": true, "param": true, "input": true, "option": true, "base": true, "meta": true }; // faster than searching in array

	let origInput = input, openedTags = 0, tag, findTagName = input.match(TAG_NAME_REGEX)[1];

	while (true)
	{
		tag = findNextTag(input);
		input = input.slice(tag[0].length + tag.index);

		if (tag == null)
		{
			return null;
		}

		// Skip if it's not same tag name we are looing for
		if (tag[1] != findTagName)
		{
			continue;
		}

		if (tag[2] == "/") continue; // skip if it's self closing tag

		if (tag[0].charAt(1) == "/") // ending tag
		{
			openedTags--;
			if (openedTags == 0) return origInput.slice(0, origInput.length - input.length);
		}
		else // starting tag
		{
			openedTags++;
		}
	}
}