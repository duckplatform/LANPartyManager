'use strict';

/**
 * Tests unitaires - Utilitaires de vues (config/viewHelpers.js)
 */

const { expect } = require('chai');
const { jsonForScript } = require('../config/viewHelpers');

describe('jsonForScript()', function () {
  it('doit empêcher une chaîne de fermer le bloc <script>', function () {
    const output = jsonForScript({ name: '</script><img src=x onerror=alert(1)>' });
    expect(output).to.not.include('</script>');
    expect(output).to.not.include('<');
  });

  const LS = String.fromCharCode(0x2028);
  const PS = String.fromCharCode(0x2029);

  it('doit produire un JSON équivalent une fois évalué', function () {
    const value = { name: 'A < B', list: [1, `x${LS}y`], nested: { ok: true } };
    expect(JSON.parse(jsonForScript(value))).to.deep.equal(value);
  });

  it('doit échapper les séparateurs de ligne Unicode', function () {
    const output = jsonForScript(`a${LS}b${PS}c`);
    expect(output).to.equal('"a\\u2028b\\u2029c"');
  });
});
