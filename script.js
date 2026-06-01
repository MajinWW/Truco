// ==========================================
// AUDIO ENGINE E EFEITOS
// ==========================================
let audioCtx = null;
function initAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === 'suspended') audioCtx.resume(); }
function playSound(type) {
    if (!audioCtx) return; const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    if (type === 'card') { osc.type = 'sine'; osc.frequency.setValueAtTime(400, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.1); gain.gain.setValueAtTime(0.5, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1); osc.start(); osc.stop(audioCtx.currentTime + 0.1); }
    else if (type === 'truco') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(120, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.6); gain.gain.setValueAtTime(1, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6); osc.start(); osc.stop(audioCtx.currentTime + 0.6); }
    else if (type === 'win') { osc.type = 'square'; osc.frequency.setValueAtTime(400, audioCtx.currentTime); osc.frequency.setValueAtTime(600, audioCtx.currentTime + 0.1); gain.gain.setValueAtTime(0.3, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3); osc.start(); osc.stop(audioCtx.currentTime + 0.3); }
}
function triggerScreenShake() { const table = document.getElementById('game-table'); const flash = document.getElementById('flash-effect'); table.classList.add('shake'); flash.classList.add('flash'); setTimeout(() => { table.classList.remove('shake'); flash.classList.remove('flash'); }, 400); }

// TOASTS E BALÕES (TRASH TALK)
function showToast(msg, type='info', duration=3000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`; toast.innerText = msg;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, duration);
}

function botSpeak(botId, text, duration=2500) {
    const bubble = document.getElementById(`bubble-${botId}`);
    if(!bubble) return;
    bubble.innerText = text; bubble.classList.remove('hidden'); setTimeout(() => bubble.classList.add('show-bubble'), 10);
    clearTimeout(bubble.hideTimeout);
    bubble.hideTimeout = setTimeout(() => { bubble.classList.remove('show-bubble'); setTimeout(() => bubble.classList.add('hidden'), 300); }, duration);
}

const frasesTruco = ["Pede seis marreco!", "Aqui tem coragem!", "Cai pra dentro!", "Vai correr?"];
const frasesVitoria = ["Toma essa!", "Muito fraco...", "Aqui é profissional.", "Aprende!"];
const frasesFuga = ["Deixa pra próxima...", "Mão podre.", "Pode levar.", "Tá com sorte."];

// ==========================================
// ESTRUTURA DO JOGO 2v2 E REGRAS
// ==========================================
const sequenciaValores = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];
const pesosNormais = { '4': 1, '5': 2, '6': 3, '7': 4, 'Q': 5, 'J': 6, 'K': 7, 'A': 8, '2': 9, '3': 10 };
const pesosNaipes = { 'ouros': 11, 'espadas': 12, 'copas': 13, 'paus': 14 };
const naipes = ['ouros', 'espadas', 'copas', 'paus'];
const simbolos = { 'ouros': '♦', 'espadas': '♠', 'copas': '♥', 'paus': '♣' };

const ordemJogadores = ['jogador', 'op2', 'aliado', 'op1']; 

let pontosNos = 0, pontosEles = 0, valorRodada = 1;
let maos = { jogador: [], op1: [], aliado: [], op2: [] };
let cartasMesa = { jogador: null, op1: null, aliado: null, op2: null };
let cartaVira = null, manilhaVal = null;

// Variáveis de Estado e Empates
let quedasNos = 0, quedasEles = 0, empates = 0, empatePrimeira = false;
let idxTurnoAtual = 0, quemComecouMao = 'jogador', quemComecouQueda = 'jogador';
let travado = false, isMaoDeFerro = false, maoDe11Ativa = false, vaiJogarCoberta = false;

document.getElementById('btn-start-game').addEventListener('click', () => { initAudio(); document.getElementById('start-screen').style.display = 'none'; iniciarNovaMao('jogador'); });

function criarBaralho() {
    let b = [];
    sequenciaValores.forEach(v => naipes.forEach(n => {
        let cor = (n === 'copas' || n === 'ouros') ? 'red' : 'black';
        let face = v; if(v === 'Q') face = '♛'; if(v === 'J') face = '♝'; if(v === 'K') face = '♚';
        b.push({ carta: v, face: face, naipe: n, valor: pesosNormais[v], cor: cor, coberta: false });
    }));
    return b.sort(() => Math.random() - 0.5);
}

// ==========================================
// INTERFACE E RENDERIZAÇÃO
// ==========================================
function getNomeCor(p) {
    if(p === 'jogador') return { n: 'Você', c: '#4caf50' };
    if(p === 'aliado') return { n: 'Parceiro', c: '#2196f3' };
    return { n: 'Op ' + (p==='op1'?'1':'2'), c: '#f44336' };
}

function atualizarUI(msg, cor = '#4caf50') {
    const elMsg = document.getElementById('status-message'); elMsg.innerText = msg; elMsg.style.color = cor; elMsg.style.borderColor = cor;
    document.getElementById('score-geral-nos').innerText = pontosNos; document.getElementById('score-geral-eles').innerText = pontosEles;
    document.getElementById('valor-rodada-display').innerText = valorRodada; document.getElementById('quedas-nos').innerText = quedasNos; document.getElementById('quedas-eles').innerText = quedasEles;
    
    const btnTruco = document.getElementById('btn-truco'); const btnSinal = document.getElementById('btn-sinal'); const btnEsconder = document.getElementById('btn-esconder');
    
    if (isMaoDeFerro || maoDe11Ativa || valorRodada >= 12) { btnTruco.disabled = true; btnSinal.disabled = true; } 
    else { btnTruco.disabled = false; btnSinal.disabled = false; btnTruco.innerText = valorRodada === 1 ? "TRUCO" : (valorRodada === 3 ? "SEIS" : (valorRodada === 6 ? "NOVE" : "DOZE")); }

    let isPrimeiraQueda = (quedasNos === 0 && quedasEles === 0 && empates === 0);
    btnEsconder.disabled = isMaoDeFerro || isPrimeiraQueda;
}

// Nova assinatura recebendo 'animate' para evitar cartas voando o tempo todo
function criarElementoCarta(c, isPlayable = false, hideFace = false, sideCard = false, animate = false) {
    const div = document.createElement('div');
    const animClass = animate ? 'anim-deal' : '';
    
    if (hideFace || (c && c.coberta)) { 
        div.className = `card card-back ${animClass} ${isMaoDeFerro ? 'card-escuro' : ''} ${sideCard ? 'card-side' : ''}`.trim(); 
        return div; 
    }
    
    div.className = `card ${animClass} ${isPlayable ? 'playable' : ''}`.trim(); div.style.color = c.cor;
    div.innerHTML = `<div class="card-top"><span>${c.carta}</span><span>${simbolos[c.naipe]}</span></div><div class="card-center">${c.face === c.carta ? simbolos[c.naipe] : c.face}</div><div class="card-bottom"><span>${c.carta}</span><span>${simbolos[c.naipe]}</span></div>`;
    return div;
}

// 'animate' só é true no começo da rodada
function renderMesa(animate = false) {
    document.getElementById('vira-card').innerHTML = '';
    document.getElementById('vira-card').appendChild(criarElementoCarta(cartaVira, false, isMaoDeFerro, false, animate));
    
    const pArea = document.getElementById('player-area'); pArea.innerHTML = '';
    maos.jogador.forEach((c, i) => { const el = criarElementoCarta(c, true, isMaoDeFerro, false, animate); el.onclick = () => jogarCarta(i); pArea.appendChild(el); });
    
    const areasBots = { aliado: 'aliado-area', op1: 'op1-area', op2: 'op2-area' };
    for (let bot in areasBots) {
        const area = document.getElementById(areasBots[bot]); area.innerHTML = '';
        let sideCard = (bot === 'op1' || bot === 'op2');
        maos[bot].forEach(() => area.appendChild(criarElementoCarta(null, false, true, sideCard, animate)));
    }
}

function renderCartaMesa(c, player) { 
    playSound('card'); 
    const slot = document.getElementById(`slot-${player}`); 
    const cDOM = criarElementoCarta(c, false, isMaoDeFerro, false, false); // Carta jogada na mesa nunca usa 'anim-deal'
    cDOM.classList.add('card-on-table'); 
    slot.innerHTML = ''; 
    slot.appendChild(cDOM); 
}

function limparMesa() { cartasMesa = { jogador: null, op1: null, aliado: null, op2: null }; document.getElementById('slot-jogador').innerHTML = ''; document.getElementById('slot-op1').innerHTML = ''; document.getElementById('slot-aliado').innerHTML = ''; document.getElementById('slot-op2').innerHTML = ''; }

// ==========================================
// AÇÕES DO JOGADOR
// ==========================================
document.getElementById('btn-sinal').addEventListener('click', () => {
    if(travado || isMaoDeFerro) return;
    let maxAliado = Math.max(...maos.aliado.map(c => c.valor), 0);
    let sinal = "🤷‍♂️ Tô cego (Nada)";
    if(maxAliado === 14) sinal = "😉 Piscou 1 olho (ZAP)"; else if(maxAliado === 13) sinal = "👅 Mostrou a língua (Copeta)";
    else if(maxAliado === 12) sinal = "🤨 Levantou sobrancelha (Espadilha)"; else if(maxAliado === 11) sinal = "🤷 Levou a mão no ombro (Pica-fumo)";
    else if(maxAliado >= 8) sinal = "Mão razoável (3, 2 ou A)";
    showToast(`Sinal do Parceiro: ${sinal}`, "signal");
});

document.getElementById('btn-esconder').addEventListener('click', function() {
    if(this.disabled) return;
    vaiJogarCoberta = !vaiJogarCoberta;
    this.innerText = vaiJogarCoberta ? "COBRIR ON" : "COBRIR OFF";
    this.classList.toggle('btn-esconder-active', vaiJogarCoberta);
});

function checarEstadoEspecial() {
    isMaoDeFerro = false; maoDe11Ativa = false;
    if (pontosNos === 11 && pontosEles === 11) { isMaoDeFerro = true; showToast("MÃO DE FERRO! Tudo no escuro.", "warning"); return true; }
    if (pontosNos === 11) { maoDe11Ativa = true; document.getElementById('mao11-modal').style.display = 'flex'; renderMesa(false); return false; }
    if (pontosEles === 11) {
        maoDe11Ativa = true; 
        let forcaOp1 = maos.op1.reduce((a, c) => a + c.valor, 0); let forcaOp2 = maos.op2.reduce((a, c) => a + c.valor, 0);
        if ((forcaOp1 + forcaOp2) >= 44) { showToast("Eles aceitaram a Mão de 11! Vale 3.", "warning"); valorRodada = 3; return true; }
        else { showToast("Eles correram da Mão de 11.", "success"); botSpeak('op1', "Pode levar."); pontosNos++; setTimeout(reiniciarGlobal, 1500); return false; }
    }
    return true;
}

document.getElementById('btn-jogar-11').onclick = () => { document.getElementById('mao11-modal').style.display = 'none'; valorRodada = 3; atualizarUI("Aceitou! Valendo 3."); continuarTurnoMao11(); };
document.getElementById('btn-correr-11').onclick = () => { document.getElementById('mao11-modal').style.display = 'none'; pontosEles++; reiniciarGlobal(); };

function continuarTurnoMao11() { let p = ordemJogadores[idxTurnoAtual]; if(p === 'jogador') { travado = false; atualizarUI("Sua vez!"); } else { travado = true; atualizarUI(`Vez do ${getNomeCor(p).n}...`, getNomeCor(p).c); setTimeout(() => turnoBot(p), 1500); } }

function iniciarNovaMao(quemComeca) {
    quemComecouMao = quemComeca; quemComecouQueda = quemComeca; idxTurnoAtual = ordemJogadores.indexOf(quemComeca);
    valorRodada = 1; quedasNos = 0; quedasEles = 0; empates = 0; empatePrimeira = false;
    
    let b = criarBaralho(); cartaVira = b.pop(); manilhaVal = sequenciaValores[(sequenciaValores.indexOf(cartaVira.carta) + 1) % 10];
    maos.jogador = b.splice(0, 3); maos.op2 = b.splice(0, 3); maos.aliado = b.splice(0, 3); maos.op1 = b.splice(0, 3);
    ordemJogadores.forEach(p => maos[p].forEach(c => { if(c.carta === manilhaVal) c.valor = pesosNaipes[c.naipe]; }));
    
    limparMesa(); renderMesa(true); // <--- AQUI A ANIMAÇÃO É CHAMADA (Distribuição)
    atualizarUI("Distribuindo...");
    if (!checarEstadoEspecial()) return;
    continuarTurnoMao11();
}

// ==========================================
// IA E FLUXO DE TURNOS 
// ==========================================
function jogarCarta(idx) {
    if (travado || ordemJogadores[idxTurnoAtual] !== 'jogador') return;
    let cartaSelecionada = maos.jogador.splice(idx, 1)[0];
    
    if (vaiJogarCoberta) { cartaSelecionada.coberta = true; cartaSelecionada.valor = 0; }
    
    cartasMesa.jogador = cartaSelecionada; 
    renderMesa(false); // <--- SEM ANIMAÇÃO NO TURNO
    renderCartaMesa(cartasMesa.jogador, 'jogador');
    
    vaiJogarCoberta = false; document.getElementById('btn-esconder').innerText = "COBRIR OFF"; document.getElementById('btn-esconder').classList.remove('btn-esconder-active');
    document.getElementById('btn-truco').disabled = true; document.getElementById('btn-sinal').disabled = true; document.getElementById('btn-esconder').disabled = true;
    avancarTurno();
}

function turnoBot(botId) {
    let meuTime = (botId === 'aliado') ? 'nos' : 'eles';

    if (meuTime === 'eles' && !isMaoDeFerro && !maoDe11Ativa && valorRodada < 12 && !cartasMesa[botId]) {
        let forcaEquipe = maos.op1.reduce((a,c)=>a+c.valor,0) + maos.op2.reduce((a,c)=>a+c.valor,0);
        let blefando = (quedasEles > 0 && Math.random() < 0.15) || (Math.random() < 0.05);
        if (Math.random() < (forcaEquipe > 50 ? 0.3 : 0) || blefando) { pedirTruco(true, botId); return; }
    }

    let maxMesa = -1, donoMax = null;
    ordemJogadores.forEach(p => { if (cartasMesa[p] && cartasMesa[p].valor > maxMesa) { maxMesa = cartasMesa[p].valor; donoMax = p; } });
    
    let timeVencendo = donoMax ? (donoMax === 'jogador' || donoMax === 'aliado' ? 'nos' : 'eles') : null;
    let ordenadas = maos[botId].map((c, i) => ({c, i})).sort((a,b) => a.c.valor - b.c.valor);
    let idxEscolhido = 0;

    if (timeVencendo === meuTime) { idxEscolhido = ordenadas[0].i; } 
    else if (maxMesa !== -1) {
        let pG = ordenadas.filter(x => x.c.valor > maxMesa); 
        idxEscolhido = pG.length > 0 ? pG[0].i : ordenadas[0].i;
    } else {
        let temManilha = ordenadas[ordenadas.length-1].c.valor > 10;
        if (quedasNos === 0 && quedasEles === 0 && temManilha && Math.random() < 0.6) idxEscolhido = ordenadas[0].i; 
        else idxEscolhido = ordenadas[Math.floor(ordenadas.length/2)].i; 
    }

    let botCobreCarta = false;
    let isPrimeira = (quedasNos === 0 && quedasEles === 0 && empates === 0);
    if (!isMaoDeFerro && !isPrimeira) {
        if ((quedasNos > 0 && meuTime === 'nos') || (quedasEles > 0 && meuTime === 'eles')) {
            if (idxEscolhido === ordenadas[0].i && Math.random() < 0.6) botCobreCarta = true; 
        }
    }

    let cartaBot = maos[botId].splice(idxEscolhido, 1)[0];
    if (botCobreCarta) { cartaBot.coberta = true; cartaBot.valor = 0; }
    
    cartasMesa[botId] = cartaBot;
    renderMesa(false); // <--- SEM ANIMAÇÃO NO TURNO
    renderCartaMesa(cartasMesa[botId], botId);
    avancarTurno();
}

function avancarTurno() {
    let jogadas = Object.values(cartasMesa).filter(c => c !== null).length;
    if (jogadas === 4) { travado = true; setTimeout(avaliarQueda, 1200); } 
    else {
        idxTurnoAtual = (idxTurnoAtual + 1) % 4; let prox = ordemJogadores[idxTurnoAtual];
        if (prox === 'jogador') { travado = false; atualizarUI("Sua vez!", "#4caf50"); document.getElementById('btn-sinal').disabled = false; }
        else { travado = true; let info = getNomeCor(prox); atualizarUI(`Vez do ${info.n}...`, info.c); setTimeout(() => turnoBot(prox), 1000); }
    }
}

function avaliarQueda() {
    let maxVal = -1, vencedores = [];
    ordemJogadores.forEach(p => { if (cartasMesa[p].valor > maxVal) maxVal = cartasMesa[p].valor; });
    ordemJogadores.forEach(p => { if (cartasMesa[p].valor === maxVal && maxVal > 0) vencedores.push(p); }); 

    let nosGanhou = vencedores.includes('jogador') || vencedores.includes('aliado');
    let elesGanhou = vencedores.includes('op1') || vencedores.includes('op2');

    let venceu = null;
    if ((nosGanhou && elesGanhou) || maxVal === 0) { 
        venceu = 'empate'; empates++; atualizarUI("Cangou! (Empate)", "#ffeb3b"); 
        if (quedasNos === 0 && quedasEles === 0 && empates === 1) empatePrimeira = true; 
    }
    else if (nosGanhou) { venceu = 'nos'; quedasNos++; atualizarUI("Nós fizemos a queda!"); playSound('win'); if(vencedores.includes('aliado')) botSpeak('aliado', frasesVitoria[Math.floor(Math.random()*frasesVitoria.length)]); }
    else if (elesGanhou) { venceu = 'eles'; quedasEles++; atualizarUI("Eles fizeram a queda!", "#f44336"); let quemFalou = vencedores.includes('op1') ? 'op1' : 'op2'; botSpeak(quemFalou, frasesVitoria[Math.floor(Math.random()*frasesVitoria.length)]); }

    atualizarUI(document.getElementById('status-message').innerText, document.getElementById('status-message').style.color);

    setTimeout(() => {
        let venceuMao = null;
        if (quedasNos >= 2) venceuMao = 'nos'; 
        else if (quedasEles >= 2) venceuMao = 'eles';
        else if (venceu === 'empate') {
            if (empatePrimeira) {
                if (quedasNos === 1) venceuMao = 'nos'; else if (quedasEles === 1) venceuMao = 'eles'; else if (empates >= 3) venceuMao = 'empate';
            } else { 
                if (quedasNos === 1) venceuMao = 'nos'; else if (quedasEles === 1) venceuMao = 'eles';
            }
        }

        if (venceuMao) {
            if (venceuMao === 'nos') { pontosNos += valorRodada; showToast(`Nós levamos a rodada! (+${valorRodada})`, 'success'); }
            else if (venceuMao === 'eles') { pontosEles += valorRodada; showToast(`Eles levaram a rodada! (+${valorRodada})`, 'error'); }
            else { showToast("Mão Melada! Ninguém pontua.", 'warning'); } 
            setTimeout(reiniciarGlobal, 1500);
        } else {
            limparMesa();
            let proximoAPuxar = quemComecouQueda; 
            if (venceu === 'nos') proximoAPuxar = vencedores.includes('jogador') ? 'jogador' : 'aliado';
            else if (venceu === 'eles') proximoAPuxar = vencedores.includes('op1') ? 'op1' : 'op2';
            
            quemComecouQueda = proximoAPuxar; idxTurnoAtual = ordemJogadores.indexOf(proximoAPuxar);
            if (proximoAPuxar === 'jogador') { travado = false; atualizarUI("Você puxa.", "#4caf50"); document.getElementById('btn-sinal').disabled = false; }
            else { travado = true; let info = getNomeCor(proximoAPuxar); atualizarUI(`${info.n} puxa.`, info.c); setTimeout(() => turnoBot(proximoAPuxar), 1000); }
        }
    }, 1500);
}

function reiniciarGlobal() {
    if (pontosNos >= 12) { showToast("🎉 CAMPEÕES! VOCÊS GANHARAM!", "success", 5000); pontosNos = 0; pontosEles = 0; }
    if (pontosEles >= 12) { showToast("💀 DERROTA! ELES GANHARAM!", "error", 5000); pontosNos = 0; pontosEles = 0; }
    let nextStartIdx = (ordemJogadores.indexOf(quemComecouMao) + 1) % 4;
    setTimeout(() => iniciarNovaMao(ordemJogadores[nextStartIdx]), 1000);
}

// ==========================================
// SISTEMA DE TRUCO DUPLAS
// ==========================================
function pedirTruco(peloOponente = false, botId = 'op1') {
    playSound('truco'); triggerScreenShake();
    let prop = valorRodada === 1 ? 3 : valorRodada + 3;
    let grito = prop === 3 ? "TRUCO" : (prop === 6 ? "SEIS" : (prop === 9 ? "NOVE" : "DOZE"));
    
    if (peloOponente) {
        botSpeak(botId, frasesTruco[Math.floor(Math.random()*frasesTruco.length)]);
        document.getElementById('truco-modal-title').innerText = `ELES PEDIRAM ${grito}!`;
        document.getElementById('btn-aumentar').style.display = prop >= 12 ? 'none' : 'block';
        document.getElementById('truco-modal').style.display = 'flex';
    } else {
        atualizarUI(`Nós pedimos ${grito}!`, "#ff9800"); travado = true;
        setTimeout(() => {
            let forcaEles = maos.op1.reduce((a,c)=>a+c.valor,0) + maos.op2.reduce((a,c)=>a+c.valor,0);
            let coragem = Math.random() * 20;
            if (forcaEles + coragem < 25) { botSpeak('op2', frasesFuga[Math.floor(Math.random()*frasesFuga.length)]); showToast("Eles fugiram!", "success"); pontosNos += valorRodada; setTimeout(reiniciarGlobal, 1500); }
            else if (forcaEles + coragem > 50 && prop < 12 && Math.random() < 0.4) { pedirTruco(true, 'op1'); }  
            else { playSound('win'); botSpeak('op1', "Manda a boa!"); showToast("Eles ACEITARAM!", "warning"); valorRodada = prop; atualizarUI("Aceito. Continue."); travado = false; }
        }, 1500);
    }
}

document.getElementById('btn-truco').onclick = () => { if (!travado) pedirTruco(false); };
document.getElementById('btn-aceitar').onclick = () => { valorRodada = valorRodada === 1 ? 3 : valorRodada + 3; document.getElementById('truco-modal').style.display = 'none'; atualizarUI("Você aceitou. Manda!"); travado = false; if(ordemJogadores[idxTurnoAtual] !== 'jogador' && !cartasMesa[ordemJogadores[idxTurnoAtual]]) turnoBot(ordemJogadores[idxTurnoAtual]); };
document.getElementById('btn-fugir').onclick = () => { document.getElementById('truco-modal').style.display = 'none'; showToast("Você fugiu.", "error"); pontosEles += valorRodada; setTimeout(reiniciarGlobal, 1500); };
document.getElementById('btn-aumentar').onclick = () => { valorRodada = valorRodada === 1 ? 3 : valorRodada + 3; document.getElementById('truco-modal').style.display = 'none'; pedirTruco(false); };