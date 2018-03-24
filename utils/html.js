"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const TAG_REGEXP = /<\/?(\w+)(?:(?:\s+\w+(?:\s*=\s*(?:".*?"|'.*?'|[\^'">\s]+))?)+\s*|\s*)(\/?)>/;
const TAG_NAME_REGEX = /^<([a-zA-Z]+)/;
function findNextTag(input) {
    return input.match(TAG_REGEXP);
}
function matchToClosingTag(input) {
    let origInput = input, openedTags = 0, tag, findTagName = input.match(TAG_NAME_REGEX)[1];
    while (true) {
        tag = findNextTag(input);
        input = input.slice(tag[0].length + tag.index);
        if (tag == null) {
            return null;
        }
        if (tag[1] != findTagName) {
            continue;
        }
        if (tag[2] == "/")
            continue;
        if (tag[0].charAt(1) == "/") {
            openedTags--;
            if (openedTags == 0)
                return origInput.slice(0, origInput.length - input.length);
        }
        else {
            openedTags++;
        }
    }
}
exports.matchToClosingTag = matchToClosingTag;
//# sourceMappingURL=html.js.map