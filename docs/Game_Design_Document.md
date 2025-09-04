# 📘 Game Design Document (GDD) – Spaceshooter (Revisado)

## 1. Visão Geral
**Título:** Spaceshooter  
**Gênero:** Ação / Bullet Hell  
**Plataformas:** Mobile e Web (cross-platform)  
**Público-alvo:** Jogadores mobile que também utilizam PC/Tablet  
**Elevator Pitch:** É como Archero, mas online, com atualizações frequentes e jogabilidade cross-platform.  

---

## 2. Core Gameplay
**Objetivo:** desbloquear naves, itens e habilidades; completar mapas e derrotar chefes.  

**Loop Principal:** Lobby → Escolha de mapa/nave → Run (waves + bosses) → Loot → Upgrades/Missões → Replay  

**Progressão:**  
- **Run:** começa nível 1, evolui até 30, reseta ao sair.  
- **Lobby:** upgrades permanentes, fusão de itens, loja, missões diárias/semanais.  

**Combate:**  
- Esquivar de projéteis e inimigos  
- Atacar automaticamente (dependendo do controle)  
- Perde ao chegar a 0 de HP  

**Controles:**  
- **Mobile (vertical):** 1 joystick → movimento; atira automaticamente ao parar  
- **Mobile (horizontal):** 2 joysticks → movimento + mira  
- **PC/Web:** WASD/setas para movimento + mouse (ou disparo automático)  

---

## 3. Narrativa & Universo
**Lore:** No futuro, a galáxia sofre com A Anomalia, uma fenda cósmica que corrompe sistemas inteiros. Pilotos da Fronteira, usando naves com Núcleos de Consciência, são a última esperança.  

**História:** Cada mapa representa um sistema corrompido. Derrotar o boss liberta o sistema e concede relíquias para conter a expansão da Anomalia.  

**Naves Jogáveis:**  
- **Aurora Prime:** balanceada, cura leve ao coletar EXP  
- **Voidfang:** alto dano, baixa vida  
- **Solaris IX:** dano em área com explosões solares  
- **Nebula Serpent:** evasiva, invoca drones  
- **Chronos-7:** manipula tempo, reduzindo velocidade dos projéteis inimigos  

---

## 4. Mapas & Estrutura
### 1. 🗺️ Mapa de Fases
- Estrutura: até 30 fases consecutivas  
- Progressão: ondas de inimigos → portal → próxima fase  
- Bosses: fases 10, 20 e 30 (concedem habilidades extras)  
- Variações: curtos (10–15 fases) e longos (30 fases)  
- Objetivo: completar todas as fases até o boss final  

### 2. 🛡️ Mapa de Defesa
- Estrutura: tempo fixo de 6 minutos  
- Objetivo: defender uma estrutura espacial (estação, portal, nave)  
- Progressão: waves crescentes atacam jogador + objetivo  
- Bosses: 2:59 (intermediário) e 5:59 (final)  
- Arena: mapas grandes, com obstáculos (asteroides, destroços, satélites)  
- Recompensa extra: loot bônus se a estrutura terminar com alta durabilidade  

### 3. 🔮 Futuros Tipos
- Corrida (Speedrun)  
- Exploração (rotas alternativas)  
- Hardcore (mais inimigos, sem reviver)  

---

## 5. Chefes (Bosses)
- **Kragg, Senhor dos Asteroides (Cinturão Esquecido):** invoca piratas e cria obstáculos  
- **Syrion, Coração de Plasma (Quasar de Sangue):** acelera projéteis a cada fase  
- **Mirage-Ω (Nebulosa Prismática):** cria clones ilusórios, apenas 1 é real  
- **Vorath, Devorador de Estrelas (Buraco Negro):** gravidade aumenta progressivamente  
- **Omega Hive (Cidade Orbital):** alterna entre vulnerável e protegido por drones  

Todos têm **3 fases**, com padrões de tiro diferentes, e dropam **baús raros ou habilidades especiais**.  

---

## 6. Arte & Estilo Visual
- **Referências:** Archero, Suvervio, Space Invaders  
- **Estilo gráfico:** Low Poly futurista, vibrante, cores contrastantes  
- **UI/UX:** HTML/CSS + Vue  

---

## 7. Áudio
- **Trilha sonora:** Synthwave espacial (variações por mapa)  
- **Efeitos sonoros:** únicos por arma, impacto e chefes  
- **Bosses:** sons graves para transmitir peso  

---

## 8. Progressão e Sistemas
### 8.1 Economia
- **Ouro:** ganho em missões, anúncios opcionais e conclusão de fases. Usado em upgrades e equipamentos.  
- **Moeda Paga:** obtida via microtransações. Usada para comprar ouro, baús e acelerar progressão.  

### 8.2 Inventário & Itens
- **Categorias:**  
  - Armas Primárias (Railgun, Canhão de Plasma, Laser, Mísseis)  
  - Armas Secundárias (Drones, Minas, Torretas)  
  - Escudos (Prismático, Cinético, Energético)  
  - Propulsores (Íon, Quântico, Dobra)  
  - Geradores (Solar, Fusão, Matéria Escura)  
  - Módulos Táticos (Radar, IA de Mira, Conversor de Loot)  
  - Estéticos (Skins, trilhas, efeitos visuais)  

- **Sistema de Raridade:**  
  - **Comum:** efeito base  
  - **Raro:** +% no efeito principal  
  - **Épico:** efeito secundário  
  - **Lendário:** transforma jogabilidade  
  - **Mítico:** efeito exclusivo ou combinação de lendários  

### 8.3 Missões & Recompensas
- **Diárias/Semanais:** sistema de pontos (0–100) com baús em milestones  
- **Bônus diário:** ciclo de 7 dias  
- **Modo Hardcore (futuro):** versões mais difíceis dos mapas  

---

## 9. Habilidades Temporárias (Skills)
- **Ataque:** Canhões Duplos, Laser Perfurante, Explosão de Íons, Rastro de Plasma  
- **Defesa:** Campo de Energia, Regeneração Nanobot, Drone Guardião  
- **Utilidade:** Propulsão Avançada, Campo Gravitacional, Drop Extra  
- **Especiais:** Supernova, Singularidade, Arsenal Vivo  

- **Regras:**  
  - Escolhidas a cada level up (3 opções aleatórias)  
  - Comuns aparecem sempre, raras/épicas têm menor chance  
  - Podem gerar **sinergias** (ex: Laser Perfurante + Explosão de Íons = AoE massivo)  

---

## 10. Monetização
- **Modelo:** Free-to-play  
- **Estratégias:**  
  - Anúncios opcionais (reviver, energia extra, loot extra)  
  - Battle Pass (recompensas de fidelidade)  
  - Microtransações (ouro, moeda paga, baús, cosméticos)  

---

## 11. Tecnologia & Produção
- **Engine:** Custom Three.js  
- **Ferramentas:** Blender, Socket.IO  
- **Pipeline:** MVP → Alpha → Beta → Release  
- **Equipe:** Programação, Arte 3D Low Poly, UI/UX, Áudio, Game Design  

---

## 12. Diferenciais
- Cross-platform (mobile + web)  
- Controles inovadores (vertical/horizontal)  
- Bullet Hell com meta-game robusto  
- Variação de mapas (fases, defesa, futuros modos)  
- Eventos sazonais e atualizações frequentes  

---

## 13. Loop de Jogo
**Fluxo:** Lobby → Escolha de mapa/nave → Run (waves + bosses) → Loot/EXP → Retorno ao Lobby → Upgrades/Missões → Replay  

| Etapa         | Descrição                     | Ações do Jogador                  | Resultado                  |
|---------------|-------------------------------|------------------------------------|----------------------------|
| Lobby         | Hub principal                 | Missões, loja, upgrades            | Preparo para run           |
| Início da Run | Entrada no mapa               | Nível 1, primeiras waves           | EXP inicial                |
| Waves         | Combates                      | Esquiva, matar inimigos, pegar loot| Escolha de skills          |
| Chefes        | Final de mapa                 | Padrões únicos de ataque           | Loot raro                  |
| Fim da Run    | Vitória ou derrota            | Vence → mantém loot / perde → nada | Progressão parcial ou total|
| Missões       | Fora da run                   | Diárias/semanais, bônus de pontos  | Recompensas extras         |
| Upgrades      | Meta-game                     | Upar status, fundir itens, comprar | Personagem mais forte      |
| Replay        | Recomeço                      | Escolhe mapa ou repete             | Retenção contínua          |
