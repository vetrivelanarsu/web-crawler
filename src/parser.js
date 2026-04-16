// Node types
const ELEMENT = 1, TEXT = 3;

function parse(html) {
  const root = { type: ELEMENT, tag: '#root', attrs: {}, children: [], parent: null };
  let current = root;
  let i = 0;

  const SELF_CLOSING = new Set([
    'area','base','br','col','embed','hr','img','input',
    'link','meta','param','source','track','wbr'
  ]);

  function readTagName() {
    let name = '';
    while (i < html.length && !/[\s/>]/.test(html[i])) name += html[i++];
    return name.toLowerCase();
  }

  function readAttributes() {
    const attrs = {};
    while (i < html.length && html[i] !== '>' && !(html[i] === '/' && html[i+1] === '>')) {
      // skip whitespace
      while (i < html.length && /\s/.test(html[i])) i++;
      if (html[i] === '>' || html[i] === '/') break;

      let attrName = '';
      while (i < html.length && !/[\s=/>]/.test(html[i])) attrName += html[i++];
      attrName = attrName.toLowerCase();
      if (!attrName) { i++; continue; }

      while (i < html.length && /\s/.test(html[i])) i++;

      if (html[i] === '=') {
        i++; // skip =
        while (i < html.length && /\s/.test(html[i])) i++;
        let val = '';
        if (html[i] === '"' || html[i] === "'") {
          const quote = html[i++];
          while (i < html.length && html[i] !== quote) val += html[i++];
          i++; // close quote
        } else {
          while (i < html.length && !/[\s>]/.test(html[i])) val += html[i++];
        }
        attrs[attrName] = val;
      } else {
        attrs[attrName] = attrName; // boolean attr
      }
    }
    return attrs;
  }

  while (i < html.length) {
    if (html[i] === '<') {
      i++;

      // Comment
      if (html.slice(i, i+3) === '!--') {
        const end = html.indexOf('-->', i);
        i = end === -1 ? html.length : end + 3;
        continue;
      }

      // DOCTYPE / CDATA
      if (html[i] === '!') {
        while (i < html.length && html[i] !== '>') i++;
        i++;
        continue;
      }

      // Closing tag
      if (html[i] === '/') {
        i++;
        const tagName = readTagName();
        while (i < html.length && html[i] !== '>') i++;
        i++;
        // Walk up to matching tag
        let node = current;
        while (node && node.tag !== tagName) node = node.parent;
        if (node && node.parent) current = node.parent;
        continue;
      }

      // Opening tag
      const tagName = readTagName();
      if (!tagName) { i++; continue; }

      const attrs = readAttributes();
      const selfClose = html[i] === '/';
      while (i < html.length && html[i] !== '>') i++;
      i++; // skip >

      const node = { type: ELEMENT, tag: tagName, attrs, children: [], parent: current };
      current.children.push(node);

      if (!selfClose && !SELF_CLOSING.has(tagName)) {
        // Skip script/style content
        if (tagName === 'script' || tagName === 'style') {
          const closeTag = `</${tagName}`;
          const end = html.toLowerCase().indexOf(closeTag, i);
          i = end === -1 ? html.length : end;
        } else {
          current = node;
        }
      }

    } else {
      // Text node
      let text = '';
      while (i < html.length && html[i] !== '<') text += html[i++];
      const decoded = text.replace(/&amp;/g, '&')
                          .replace(/&lt;/g, '<')
                          .replace(/&gt;/g, '>')
                          .replace(/&quot;/g, '"')
                          .replace(/&#39;/g, "'")
                          .replace(/&nbsp;/g, ' ');
      if (decoded.trim()) {
        current.children.push({ type: TEXT, text: decoded, parent: current });
      }
    }
  }

  return root;
}

module.exports = { parse, ELEMENT, TEXT };