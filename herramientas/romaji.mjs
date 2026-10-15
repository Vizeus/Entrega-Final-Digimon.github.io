// Pasa un nombre escrito en romaji (el que usa Wikimon: Hepburn, con macrones o con "ou"/"oh") a hiragana. Devuelve null si el texto no es romaji japonés
// (por ejemplo, un nombre en inglés: "Bless Fire"). Lo usa furigana.mjs para sacar la lectura de los nombres de los ataques.
// romaji (Hepburn/Kunrei flojo) → hiragana
const base = {
    a: 'あ',
    i: 'い',
    u: 'う',
    e: 'え',
    o: 'お',
    ka: 'か',
    ki: 'き',
    ku: 'く',
    ke: 'け',
    ko: 'こ',
    sa: 'さ',
    shi: 'し',
    si: 'し',
    su: 'す',
    se: 'せ',
    so: 'そ',
    ta: 'た',
    chi: 'ち',
    ti: 'ち',
    tsu: 'つ',
    tu: 'つ',
    te: 'て',
    to: 'と',
    na: 'な',
    ni: 'に',
    nu: 'ぬ',
    ne: 'ね',
    no: 'の',
    ha: 'は',
    hi: 'ひ',
    fu: 'ふ',
    hu: 'ふ',
    he: 'へ',
    ho: 'ほ',
    ma: 'ま',
    mi: 'み',
    mu: 'む',
    me: 'め',
    mo: 'も',
    ya: 'や',
    yu: 'ゆ',
    yo: 'よ',
    ra: 'ら',
    ri: 'り',
    ru: 'る',
    re: 'れ',
    ro: 'ろ',
    wa: 'わ',
    wo: 'を',
    ga: 'が',
    gi: 'ぎ',
    gu: 'ぐ',
    ge: 'げ',
    go: 'ご',
    za: 'ざ',
    ji: 'じ',
    zi: 'じ',
    zu: 'ず',
    ze: 'ぜ',
    zo: 'ぞ',
    da: 'だ',
    di: 'ぢ',
    du: 'づ',
    dzu: 'づ',
    de: 'で',
    do: 'ど',
    ba: 'ば',
    bi: 'び',
    bu: 'ぶ',
    be: 'べ',
    bo: 'ぼ',
    pa: 'ぱ',
    pi: 'ぴ',
    pu: 'ぷ',
    pe: 'ぺ',
    po: 'ぽ',
    kya: 'きゃ',
    kyu: 'きゅ',
    kyo: 'きょ',
    sha: 'しゃ',
    shu: 'しゅ',
    sho: 'しょ',
    sya: 'しゃ',
    syu: 'しゅ',
    syo: 'しょ',
    cha: 'ちゃ',
    chu: 'ちゅ',
    cho: 'ちょ',
    nya: 'にゃ',
    nyu: 'にゅ',
    nyo: 'にょ',
    hya: 'ひゃ',
    hyu: 'ひゅ',
    hyo: 'ひょ',
    mya: 'みゃ',
    myu: 'みゅ',
    myo: 'みょ',
    rya: 'りゃ',
    ryu: 'りゅ',
    ryo: 'りょ',
    gya: 'ぎゃ',
    gyu: 'ぎゅ',
    gyo: 'ぎょ',
    ja: 'じゃ',
    ju: 'じゅ',
    jo: 'じょ',
    jya: 'じゃ',
    jyu: 'じゅ',
    jyo: 'じょ',
    bya: 'びゃ',
    byu: 'びゅ',
    byo: 'びょ',
    pya: 'ぴゃ',
    pyu: 'ぴゅ',
    pyo: 'ぴょ',
    fa: 'ふぁ',
    fi: 'ふぃ',
    fe: 'ふぇ',
    fo: 'ふぉ',
    dzi: 'ぢ',
};
const largas = { ā: 'aa', ī: 'ii', ū: 'uu', ē: 'ei', ō: 'ou', Ā: 'aa', Ī: 'ii', Ū: 'uu', Ē: 'ei', Ō: 'ou' };
export function aHiragana(romaji) {
    let s = romaji
        .toLowerCase()
        .replace(/[āīūēōĀĪŪĒŌ]/g, c => largas[c])
        .replace(/[^a-z']/g, ' ');
    let r = '';
    for (const palabra of s.split(' ')) {
        let i = 0;
        while (i < palabra.length) {
            const c = palabra[i];
            if (c === "'") {
                i++;
                continue;
            }
            // n silábica
            if (c === 'n' && !(palabra[i + 1] && /[aiueoy]/.test(palabra[i + 1]))) {
                r += 'ん';
                i++;
                if (palabra[i] === "'") i++;
                continue;
            }
            // geminada
            if (palabra[i + 1] === c && /[kstpgzdbhfcj]/.test(c)) {
                r += 'っ';
                i++;
                continue;
            }
            if (c === 't' && palabra[i + 1] === 'c' && palabra[i + 2] === 'h') {
                r += 'っ';
                i++;
                continue;
            }
            let hallado = null;
            for (const n of [3, 2, 1]) {
                const t = palabra.slice(i, i + n);
                if (base[t]) {
                    hallado = [t, base[t]];
                    break;
                }
            }
            if (!hallado) return null;
            r += hallado[1];
            i += hallado[0].length;
        }
    }
    return r;
}
