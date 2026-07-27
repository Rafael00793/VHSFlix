/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Heart, Copy, Check, QrCode, ShieldCheck, Gift, HeartHandshake, CreditCard, AlertCircle, Sparkles } from 'lucide-react';

interface SupportPanelProps {
  onClose?: () => void;
}

export default function SupportPanel({ onClose }: SupportPanelProps) {
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [copiedPayload, setCopiedPayload] = useState<boolean>(false);

  const pixKey = '(14) 99684-2893';
  const pixKeyUnformatted = '14996842893';
  const pixHolder = 'Rafael de Andrade Gusmão';
  const pixBank = 'PicPay';
  
  // Payload do Pix Copia e Cola correspondente ao PicPay da chave 14996842893
  const pixPayload = '00020126360014br.gov.bcb.pix0114149968428935204000053039865802BR5925Rafael de Andrade Gusmao6009SAO PAULO62070503***6304';

  const handleCopyKey = () => {
    navigator.clipboard.writeText(pixKeyUnformatted);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 3000);
  };

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(pixPayload);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 3000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white pt-20 pb-24 px-4 sm:px-6 md:px-8 font-sans selection:bg-rose-500 selection:text-white">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Cabeçalho do Apoio */}
        <div className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-900 to-rose-950/40 border border-rose-500/30 rounded-2xl p-6 sm:p-10 shadow-2xl">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-10 -top-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-inner">
                  <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 animate-pulse" />
                  APOIO AO CANAL
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="w-3.5 h-3.5" /> 30 Dias de Acesso Renovado
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold font-display tracking-tight text-white flex items-center gap-3">
                Apoiar o Projeto <span className="text-rose-500 italic font-mono text-xl sm:text-2xl">VHSFLIX</span>
              </h1>

              <p className="text-zinc-300 text-sm sm:text-base leading-relaxed max-w-2xl">
                Contribua para manter o nosso catálogo ativo, com servidores de alta velocidade, novos lançamentos e episódios diários sem interrupções.
              </p>
            </div>

            <div className="flex-shrink-0 bg-zinc-950/80 border border-zinc-800 p-4 rounded-xl flex flex-col items-center justify-center text-center shadow-lg">
              <HeartHandshake className="w-10 h-10 text-rose-500 mb-1" />
              <span className="text-xs font-mono font-bold text-zinc-400 uppercase">Comunidade Viva</span>
              <span className="text-xs text-rose-400 font-bold mt-0.5">100% Mantido por Membros</span>
            </div>
          </div>
        </div>

        {/* Aviso aos Usuários */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 sm:p-5 flex items-start gap-3 text-amber-200 text-xs sm:text-sm leading-relaxed shadow-lg backdrop-blur-sm">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold uppercase tracking-wider text-amber-400 block mb-1 font-mono">Aviso Importante</span>
            <p>
              "Este projeto é mantido graças ao apoio dos seus usuários. Sua contribuição ajuda a custear hospedagem, manutenção, atualizações e melhorias constantes do site. Todo apoio é muito bem-vindo."
            </p>
          </div>
        </div>

        {/* Escolha o Valor da sua Contribuição (Apenas Mensagem Informativa, sem Botões) */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xl">
          <div className="border-b border-zinc-800 pb-3">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 font-display uppercase tracking-wider">
              <Gift className="w-5 h-5 text-rose-500" />
              Escolha o Valor da sua Contribuição
            </h2>
          </div>

          <div className="bg-zinc-950/80 border border-zinc-850 rounded-xl p-5 sm:p-6 space-y-3">
            <div className="flex items-center gap-2 text-rose-400 font-mono text-base sm:text-lg font-bold uppercase tracking-wider">
              <Sparkles className="w-5 h-5 text-rose-500" />
              Qualquer Valor
            </div>
            <p className="text-zinc-200 text-sm sm:text-base leading-relaxed">
              Sinta-se inteiramente à vontade para contribuir com a quantia que vier ao seu coração! Não existe um valor fixo nem mínimo obrigatório. O projeto é mantido integralmente através do carinho e apoio espontâneo dos nossos membros, garantindo que o site continue online, rápido e com conteúdos atualizados para todos.
            </p>
          </div>
        </div>

        {/* Card Principal dos Dados do Pix (Em Destaque, Sem QR Code) */}
        <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-rose-500/30 rounded-2xl p-6 sm:p-10 space-y-6 shadow-2xl relative overflow-hidden">
          
          <div className="space-y-6">
            
            <div className="border-b border-zinc-800 pb-4">
              <span className="text-xs sm:text-sm font-mono font-bold uppercase tracking-widest text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-full border border-rose-500/30 shadow-inner inline-flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                DADOS PARA TRANSFERÊNCIA PIX
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-display mt-3">
                Informações para Pagamento
              </h3>
            </div>

            {/* Informações Grandes em Destaque */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-5 font-sans shadow-inner">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-900 pb-4">
                <span className="text-zinc-400 text-xs sm:text-sm font-mono font-bold uppercase tracking-wider">
                  Nome do Beneficiário:
                </span>
                <span className="text-white font-extrabold text-lg sm:text-xl text-left sm:text-right">
                  {pixHolder}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-900 pb-4">
                <span className="text-zinc-400 text-xs sm:text-sm font-mono font-bold uppercase tracking-wider">
                  Instituição / Banco:
                </span>
                <span className="text-emerald-400 font-extrabold text-lg sm:text-xl flex items-center gap-2 text-left sm:text-right">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                  {pixBank}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-zinc-400 text-xs sm:text-sm font-mono font-bold uppercase tracking-wider">
                  Chave Pix (Celular):
                </span>
                <span className="text-rose-400 font-extrabold font-mono text-xl sm:text-2xl tracking-wide text-left sm:text-right">
                  {pixKey}
                </span>
              </div>

            </div>

            {/* Botões do Pix */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button
                onClick={handleCopyKey}
                className={`flex-1 py-4 px-6 rounded-xl font-bold font-mono text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-xl active:scale-95 ${
                  copiedKey
                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/50'
                }`}
              >
                {copiedKey ? (
                  <>
                    <Check className="w-5 h-5" /> Chave Copiada com Sucesso!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" /> Copiar Chave Pix
                  </>
                )}
              </button>

              <button
                onClick={handleCopyPayload}
                className={`flex-1 py-4 px-6 rounded-xl font-bold font-mono text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer border shadow-xl active:scale-95 ${
                  copiedPayload
                    ? 'bg-emerald-600 border-emerald-500 text-white'
                    : 'bg-zinc-950 hover:bg-zinc-800 border-zinc-700 text-zinc-200'
                }`}
              >
                {copiedPayload ? (
                  <>
                    <Check className="w-5 h-5 text-white" /> Código Pix Copiado!
                  </>
                ) : (
                  <>
                    <QrCode className="w-5 h-5 text-emerald-400" /> Copiar Pix Copia e Cola
                  </>
                )}
              </button>
            </div>

          </div>
        </div>

        {/* Mensagem de Agradecimento */}
        <div className="relative bg-gradient-to-r from-rose-950/30 via-zinc-900 to-rose-950/30 border border-rose-500/40 rounded-2xl p-6 sm:p-8 space-y-3 shadow-xl">
          <div className="flex items-center gap-2 text-rose-400 font-mono text-xs font-bold uppercase tracking-wider">
            <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
            MENSAGEM DE AGRADECIMENTO
          </div>

          <blockquote className="text-zinc-200 text-sm sm:text-base leading-relaxed italic font-sans border-l-4 border-rose-500 pl-4 py-1">
            "Muito obrigado pelo seu apoio! Cada contribuição é fundamental para manter este projeto funcionando e disponibilizando conteúdo para todos. Independentemente do valor escolhido, saiba que sua ajuda faz toda a diferença. Que Deus abençoe grandemente a sua vida, sua família e multiplique tudo aquilo que você tem semeado. Obrigado por fazer parte deste projeto!"
          </blockquote>

          <div className="text-right pt-2">
            <span className="text-xs font-mono text-zinc-400 font-bold uppercase">
              — Equipe VHSFLIX & Rafael Gusmão
            </span>
          </div>
        </div>

        {/* Como Funciona o Sistema de Apoio */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 space-y-3">
          <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-rose-500" />
            Como Funciona o Sistema de Apoio e Acesso?
          </h3>

          <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed">
            O site funciona por meio do apoio dos usuários. O acesso ao conteúdo é renovado por 30 dias após a contribuição realizada. Caso o período expire e não haja renovação do apoio, o acesso ao site poderá ser suspenso até uma nova contribuição.
          </p>
        </div>

      </div>
    </div>
  );
}
