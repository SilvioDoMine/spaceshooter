# ⚙️ Item, Skill & Stats Design Document – Spaceshooter

## 1. Atributos (Core Stats)
- **HP (Vida):** dano que a nave pode receber
- **ATK (Dano):** dano base por tiro/projétil
- **DEF (Defesa):** redução percentual de dano recebido
- **SPD (Velocidade):** velocidade de movimento da nave
- **CRT (Crítico):** chance de ataque crítico (x2 ou x3 de dano)
- **CDR (Cooldown Reduction):** reduz recarga de habilidades/itens
- **MAG (Energia Cósmica):** escala eficiência de habilidades especiais
- **LCK (Sorte):** influencia em loot/drop

> Sugestão: definir valores iniciais padrão por nave e curva de progressão por upgrade permanente.

### Atributos Base por Nave

| Nave            | HP  | ATK | DEF  | SPD | CRT  | CDR | MAG | LCK |
|-----------------|-----|-----|------|-----|------|-----|-----|-----|
| **Aurora Prime** | 120 | 10  | 0.05 | 220 | 5%   | 0%  | 0%  | 5%  |
| **Voidfang**     | 80  | 18  | 0.00 | 240 | 10%  | 0%  | 0%  | 3%  |
| **Solaris IX**   | 100 | 12  | 0.05 | 210 | 5%   | 0%  | 5%  | 4%  |
| **Nebula Serpent** | 90 | 9   | 0.03 | 260 | 7%   | 0%  | 3%  | 6%  |
| **Chronos-7**    | 110 | 11  | 0.06 | 200 | 5%   | 5%  | 10% | 5%  |

---

## 2. Itens Permanentes (Equipamentos)

### Categorias
- **Armas Primárias:** Railgun, Canhão de Plasma, Laser de Fóton, Mísseis Guiados
- **Armas Secundárias:** Drones, Minas, Torretas
- **Escudos:** Prismático, Cinético, Energético
- **Propulsores:** Íon, Quântico, Dobra
- **Geradores:** Solar, Fusão, Matéria Escura
- **Módulos Táticos:** Radar, IA de Mira, Conversor de Loot
- **Estéticos:** Skins, trilhas, efeitos visuais

### Sistema de Raridade
- **Comum:** efeito base
- **Raro:** +% no efeito principal
- **Épico:** adiciona efeito secundário
- **Lendário:** transforma a jogabilidade
- **Mítico:** combina dois efeitos lendários ou dá efeito exclusivo

> Cada item deve ter tabela de progressão com valores exatos de dano, defesa, recarga, etc.

---

## 3. Habilidades Temporárias (Skills de Run)

### Categorias
- **Ataque:** Canhões Duplos, Laser Perfurante, Explosão de Íons, Rastro de Plasma
- **Defesa:** Campo de Energia, Regeneração Nanobot, Drone Guardião
- **Utilidade:** Propulsão Avançada, Campo Gravitacional, Drop Extra
- **Especiais:** Supernova, Singularidade, Arsenal Vivo

### Regras
- Escolhidas a cada level up (3 opções aleatórias)
- Comuns aparecem sempre; raras/épicas têm menor chance
- Algumas habilidades podem sinergizar (ex: Laser Perfurante + Explosão de Íons = AoE massivo)

---

## 4. Sinergias e Builds

### Exemplos
- **Build de Ricochete:** Railgun Lendário + Canhões Duplos → tiros múltiplos que ricocheteiam
- **Build Tank:** Escudo Prismático + Drone Guardião + DEF upgrades
- **Build Drones:** Drone Gêmeo + Arsenal Vivo + CDR alto
- **Build Crítico:** IA de Mira + LCK + CRT → chance alta de críticos explosivos

### Futuro
Expandir sinergias com novos mapas, bosses e equipamentos especiais.
