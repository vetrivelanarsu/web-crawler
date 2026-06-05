const { ELEMENT, TEXT } = require('./parser');

class NodeList {
  constructor(nodes) { this.nodes = nodes; }

  // Text content of first match
  text() {
    if (!this.nodes.length) return '';
    return extractText(this.nodes[0]).trim();
  }

  // All text matches
  texts() {
    return this.nodes.map(n => extractText(n).trim()).filter(Boolean);
  }

  // Attribute of first match
  attr(name) {
    if (!this.nodes.length) return null;
    return this.nodes[0].attrs?.[name] ?? null;
  }

  // All attribute values
  attrs(name) {
    return this.nodes.map(n => n.attrs?.[name]).filter(Boolean);
  }

  // Chain: find within matched nodes
  find(selector) {
    const all = [];
    for (const node of this.nodes) {
      all.push(...querySelectorAll(node, selector));
    }
    return new NodeList(all);
  }

  get length() { return this.nodes.length; }
  get(i) { return this.nodes[i]; }
}

function extractText(node) {
  if (node.type === TEXT) return node.text;
  if (!node.children) return '';
  return node.children.map(extractText).join('');
}

// CSS selector engine (tag, #id, .class, [attr], [attr=val], combinators: space and >)
function matchesSelector(node, selector) {
  if (node.type !== ELEMENT) return false;
  selector = selector.trim();

  // tag
  if (/^[a-z][a-z0-9]*$/i.test(selector)) return node.tag === selector.toLowerCase();

  // #id
  if (selector.startsWith('#')) return node.attrs?.id === selector.slice(1);

  // .class
  if (selector.startsWith('.')) {
    const cls = selector.slice(1);
    return (node.attrs?.class || '').split(/\s+/).includes(cls);
  }

  // [attr] or [attr=val]
  const attrMatch = selector.match(/^\[([^\]=]+)(?:=["']?([^"'\]]+)["']?)?\]$/);
  if (attrMatch) {
    const [, attrName, attrVal] = attrMatch;
    if (attrVal === undefined) return attrName in (node.attrs || {});
    return node.attrs?.[attrName] === attrVal;
  }

  // Compound: tag.class or tag#id
  const compound = selector.match(/^([a-z][a-z0-9]*)([.#].+)$/i);
  if (compound) {
    return matchesSelector(node, compound[1]) && matchesSelector(node, compound[2]);
  }

  return false;
}

function querySelectorAll(root, selector) {
  const results = [];

  // Handle descendant combinator (space)
  const parts = selector.split(/\s+(?![^[]*\])/);
  if (parts.length > 1) {
    let candidates = [root];
    for (const part of parts) {
      const next = [];
      for (const c of candidates) {
        next.push(...getAllDescendants(c).filter(n => matchesSelector(n, part)));
      }
      candidates = next;
    }
    return candidates;
  }

  // Handle child combinator (>)
  const childParts = selector.split(/\s*>\s*/);
  if (childParts.length > 1) {
    let candidates = [root];
    for (const part of childParts) {
      const next = [];
      for (const c of candidates) {
        const children = (c.children || []).filter(n => matchesSelector(n, part.trim()));
        next.push(...children);
      }
      candidates = next;
    }
    return candidates;
  }

  // Single selector — walk all descendants
  walk(root, node => {
    if (matchesSelector(node, selector)) results.push(node);
  });
  return results;
}

function getAllDescendants(node) {
  const all = [];
  walk(node, n => { if (n !== node) all.push(n); });
  return all;
}

function walk(node, fn) {
  fn(node);
  if (node.children) node.children.forEach(c => walk(c, fn));
}

function createQuerier(root) {
  return function $(selector) {
    return new NodeList(querySelectorAll(root, selector));
  };
}

module.exports = { createQuerier };