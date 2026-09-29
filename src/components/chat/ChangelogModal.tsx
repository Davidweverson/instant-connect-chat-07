import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface ChangelogEntry {
  version: string;
  date: string;
  items: { type: "new" | "improvement" | "fix"; text: string }[];
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: "v2.1.0",
    date: "06/07/2026",
    items: [
      { type: "new", text: "Sistema de canais nos grupos: cada grupo tem #geral por padrão e admins podem criar, renomear, arquivar, restaurar, excluir e reordenar canais" },
      { type: "new", text: "Categorias de canais: agrupe canais por assunto, recolha e expanda, mova canais entre categorias" },
      { type: "new", text: "Sidebar dedicada de canais dentro do grupo — troca de canal instantânea sem recarregar o chat" },
      { type: "new", text: "Painel de canais responsivo: no celular vira drawer lateral abrindo pelo ícone de menu" },
      { type: "improvement", text: "Arquitetura de canais preparada para: canais privados, somente leitura, canais de voz e chamadas por canal (em breve)" },
      { type: "improvement", text: "Glassmorphism aplicado no painel de canais, header do grupo, dropdowns e input do canal" },
      { type: "improvement", text: "Suporte completo a `prefers-reduced-motion` do sistema: reduz partículas, animações e cursor decorativo automaticamente" },
      { type: "improvement", text: "Token `border-glass-border` centralizado — bordas de painéis glass agora consistentes em todo o app" },
      { type: "fix", text: "Mensagens antigas dos grupos foram migradas automaticamente para o canal #geral, sem perda de histórico" },
    ],
  },
  {
    version: "v1.7.0",
    date: "08/06/2026",
    items: [
      { type: "fix", text: "Threads funcionando de verdade — abrir, responder e ver respostas em tempo real (o bug \"Sala não encontrada\" foi resolvido)" },
      { type: "new", text: "Cursores personalizados: agora você escolhe entre Escuro, Claro, Automático ou o clássico FlashMaterial em Configurações → Aparência" },
      { type: "improvement", text: "Interface mais arredondada e fluida: cantos suaves, transições refinadas e sombras sutis em todo o site" },
      { type: "improvement", text: "Marca \"FlashChat BETA\" no topo da sidebar agora em Orbitron (toda a frase com a mesma fonte)" },
    ],
  },
  {
    version: "v1.6.0",
    date: "07/06/2026",
    items: [
      { type: "new", text: "Nova identidade tipográfica: Orbitron para títulos e marca, Cabin para textos e menus" },
      { type: "fix", text: "Threads agora têm campo de resposta — dá pra conversar paralelamente de verdade" },
      { type: "new", text: "Botão de abrir thread em qualquer mensagem, mesmo sem respostas ainda" },
      { type: "fix", text: "Menu de ações ao passar o mouse não estoura mais para fora da tela (reposicionado acima da mensagem)" },
      { type: "fix", text: "Áudios e anexos sem texto agora podem ser enviados nas DMs sem erro" },
      { type: "fix", text: "Alerta de novo dispositivo mostra nome amigável (\"Chrome em Windows\") em vez do user-agent cru" },
      { type: "fix", text: "PWA instalável: ícones PNG dedicados e service worker com fetch handler para passar no critério de instalação" },
    ],
  },
  {
    version: "v1.5.0",
    date: "06/06/2026",
    items: [
      { type: "new", text: "PWA: app instalável na tela inicial do celular (Adicionar à Tela de Início)" },
      { type: "new", text: "Push real: notificações de mensagens, voz e enquetes mesmo com a aba fechada" },
      { type: "new", text: "Threads: contador de respostas e painel lateral com toda a conversa paralela" },
      { type: "new", text: "Bloqueio de usuários — não verá mais mensagens de quem você bloqueou" },
      { type: "new", text: "Alerta de segurança ao logar em um dispositivo novo" },
      { type: "new", text: "Histórico de acessos visível em Configurações → Privacidade" },
    ],
  },
  {
    version: "v1.4.0",
    date: "05/06/2026",
    items: [
      { type: "new", text: "Gamificação: ganhe XP por cada mensagem enviada" },
      { type: "new", text: "Sistema de níveis com barra de progresso na barra lateral" },
      { type: "new", text: "Ofensiva diária — mantenha sua sequência de dias ativos" },
      { type: "new", text: "8 conquistas desbloqueáveis (Primeiro Olá, Tagarela, Veterano, Elite, etc.)" },
      { type: "new", text: "Ranking global com os 20 usuários com mais XP" },
      { type: "improvement", text: "Notificação automática ao subir de nível ou desbloquear conquista" },
    ],
  },
  {
    version: "v1.3.0",
    date: "05/06/2026",
    items: [
      { type: "new", text: "Mensagens de voz com waveform e velocidade ajustável (1x/1.5x/2x)" },
      { type: "new", text: "Enquetes com até 6 opções, voto único ou múltiplo e contagem em tempo real" },
      { type: "new", text: "Voz e enquetes agora também nas DMs" },
      { type: "new", text: "Menções @usuário com autocomplete e painel de notificações" },
      { type: "new", text: "Perfis públicos em /u/usuário" },
      { type: "new", text: "Notificações nativas do navegador quando a aba está em segundo plano" },
      { type: "new", text: "Modo Não Perturbe sincronizado entre sons e notificações" },
      { type: "improvement", text: "Busca de mensagens reescrita — agora funciona em todos os casos" },
      { type: "improvement", text: "Anexos não-imagem (PDF, ZIP, etc.) exibidos como cartão dedicado" },
      { type: "fix", text: "Menções com diferença de maiúsculas/minúsculas agora resolvem corretamente" },
    ],
  },
  {
    version: "v1.2.0",
    date: "07/04/2026",
    items: [
      { type: "new", text: "Página de configurações com personalização de tema e notificações" },
      { type: "new", text: "Modo claro/escuro com detecção automática do sistema" },
      { type: "new", text: "Changelog de novidades com indicador de não lido" },
      { type: "new", text: "Canais somente leitura para anúncios" },
      { type: "improvement", text: "Lazy loading para carregamento mais rápido" },
      { type: "improvement", text: "Cursores personalizados do FlashChat" },
    ],
  },
  {
    version: "v1.1.0",
    date: "06/04/2026",
    items: [
      { type: "new", text: "Sistema de denúncias de mensagens" },
      { type: "new", text: "Painel admin com moderação de usuários" },
      { type: "new", text: "Edição de perfil e avatar" },
      { type: "improvement", text: "Timestamps inteligentes nas mensagens" },
      { type: "fix", text: "Mensagens longas não saem mais da tela" },
    ],
  },
  {
    version: "v1.0.0",
    date: "05/04/2026",
    items: [
      { type: "new", text: "Chat em tempo real com salas temáticas" },
      { type: "new", text: "Sistema de amigos com código de amizade" },
      { type: "new", text: "Mensagens diretas entre amigos" },
      { type: "new", text: "Envio de imagens, GIFs e anexos" },
      { type: "new", text: "Indicador de digitação e presença online" },
    ],
  },
];

export const LATEST_VERSION = CHANGELOG[0]?.version || "v1.0.0";

const badgeStyles = {
  new: "bg-green-500/20 text-green-400 border-green-500/30",
  improvement: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  fix: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

const badgeLabels = {
  new: "Novo",
  improvement: "Melhoria",
  fix: "Correção",
};

interface ChangelogModalProps {
  open: boolean;
  onClose: () => void;
}

export function ChangelogModal({ open, onClose }: ChangelogModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">📋 Novidades do FlashChat</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 mt-2">
          {CHANGELOG.map((entry) => (
            <div key={entry.version}>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-bold text-primary text-sm">{entry.version}</span>
                <span className="text-xs text-muted-foreground">— {entry.date}</span>
              </div>
              <ul className="space-y-1.5">
                {entry.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 flex-shrink-0 mt-0.5 ${badgeStyles[item.type]}`}>
                      {badgeLabels[item.type]}
                    </Badge>
                    <span className="text-foreground/90">{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
