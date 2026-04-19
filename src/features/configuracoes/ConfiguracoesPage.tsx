import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Camera, ChevronLeft, RefreshCw, Settings, User as UserIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { motion } from 'motion/react'
import { useAuth } from '../../contexts/AuthContext'
import { useNotifications } from '../../contexts/NotificationContext'
import { supabase } from '../../lib/supabase'

type SettingsTab = 'Perfil' | 'Notificações' | 'Geral'

const MAX_AVATAR_BYTES = 2 * 1024 * 1024 // 2 MB

function getInitial(name: string | null | undefined) {
  return (name?.trim()?.[0] ?? '?').toUpperCase()
}

export default function ConfiguracoesPage() {
  const { profile, refreshProfile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const { success, error } = useNotifications()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [tab, setTab] = useState<SettingsTab>('Perfil')
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [username, setUsername] = useState(profile?.username ?? '')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url ?? null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [refreshingCache, setRefreshingCache] = useState(false)

  // Keep local form state in sync if the profile re-loads
  useEffect(() => {
    setFullName(profile?.full_name ?? '')
    setUsername(profile?.username ?? '')
    setAvatarUrl(profile?.avatar_url ?? null)
  }, [profile?.id])

  // Free preview URLs
  useEffect(() => {
    return () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview) }
  }, [avatarPreview])

  const onPickFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      error('Selecione um arquivo de imagem.')
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      error('Imagem muito grande (máximo 2 MB).')
      return
    }
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !profile) return avatarUrl
    const ext = avatarFile.name.split('.').pop()?.toLowerCase() ?? 'png'
    const path = `${profile.id}/avatar-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(path, avatarFile, { upsert: true, cacheControl: '3600', contentType: avatarFile.type })
    if (upErr) throw upErr
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    return data.publicUrl
  }

  const handleSave = async () => {
    if (!profile) return
    if (!fullName.trim()) {
      error('Seu nome completo não pode estar vazio.')
      return
    }
    if (!username.trim()) {
      error('Seu nome de usuário não pode estar vazio.')
      return
    }
    setSaving(true)
    try {
      const newAvatarUrl = await uploadAvatar()
      const { error: dbErr } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          username: username.trim(),
          avatar_url: newAvatarUrl,
        })
        .eq('id', profile.id)
      if (dbErr) throw dbErr
      setAvatarUrl(newAvatarUrl)
      setAvatarFile(null)
      if (avatarPreview) { URL.revokeObjectURL(avatarPreview); setAvatarPreview(null) }
      await refreshProfile()
      success('Perfil atualizado com sucesso.')
    } catch (e: any) {
      console.error('[ConfiguracoesPage] save error', e)
      error(e?.message ?? 'Não foi possível salvar o perfil.')
    } finally {
      setSaving(false)
    }
  }

  const refreshIGCache = async () => {
    if (!profile?.client?.ig_user_id || !profile?.client_id) {
      error('Instagram não configurado para esta conta.')
      return
    }
    setRefreshingCache(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('Sessão expirada.')
      const res = await fetch('/api/ig/refresh-cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ig_user_id: profile.client.ig_user_id,
          client_id: profile.client_id,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? 'Erro ao atualizar cache.')
      success(`Cache atualizado: ${data.count} posts.`)
    } catch (e: any) {
      console.error('[refreshIGCache]', e)
      error(e?.message ?? 'Falha ao atualizar cache de posts.')
    } finally {
      setRefreshingCache(false)
    }
  }

  const previewSrc = avatarPreview ?? avatarUrl ?? undefined
  const initial = getInitial(fullName || profile?.email || 'U')

  const sideButton = (id: SettingsTab, Icon: typeof UserIcon) => (
    <button
      key={id}
      onClick={() => setTab(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all ${
        tab === id
          ? 'bg-muted text-foreground'
          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
      }`}
    >
      <Icon className="w-5 h-5" />
      {id}
    </button>
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
      {/* Sidebar */}
      <div className="lg:col-span-3 space-y-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-lg font-medium">Voltar</span>
        </button>

        <div className="space-y-6">
          <div>
            <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Preferências</p>
            <div className="space-y-1">
              {sideButton('Perfil', UserIcon)}
              {sideButton('Notificações', Bell)}
            </div>
          </div>

          <div>
            <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest mb-4">
              {isAdmin ? 'Administração' : 'Integrações'}
            </p>
            <div className="space-y-1">
              {sideButton('Geral', Settings)}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="lg:col-span-9"
      >
        {tab === 'Perfil' ? (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-4xl font-bold mb-8 font-space text-center lg:text-left">Perfil</h2>
            <Card className="border-border bg-card shadow-sm overflow-hidden">
              <CardContent className="p-8 space-y-8">
                {/* Foto de Perfil */}
                <div className="flex items-center justify-between pb-8 border-b border-border/50">
                  <span className="text-base font-medium text-foreground">Foto de perfil</span>
                  <div className="relative group">
                    <Avatar className="w-20 h-20 border-2 border-background shadow-md">
                      {previewSrc && <AvatarImage src={previewSrc} />}
                      <AvatarFallback className="bg-muted text-foreground text-2xl">{initial}</AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -right-1 -bottom-1 w-9 h-9 bg-primary rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-transform"
                      aria-label="Alterar foto de perfil"
                    >
                      <Camera className="w-5 h-5 text-white" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={onPickFile}
                    />
                  </div>
                </div>

                {/* E-mail */}
                <div className="flex items-center justify-between py-4 border-b border-border/50">
                  <span className="text-base font-medium text-foreground">E-mail</span>
                  <span className="text-base text-muted-foreground font-space">{profile?.email ?? '—'}</span>
                </div>

                {/* Nome Completo */}
                <div className="space-y-3">
                  <label className="text-base font-medium text-foreground">Nome completo</label>
                  <Input
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    onBlur={() => !fullName.trim() && error('Seu nome completo não pode estar vazio.')}
                    className={`bg-muted/50 border-border h-14 rounded-xl font-space text-base transition-all ${!fullName.trim() ? 'border-red-500/50 focus-visible:ring-red-500/20' : ''}`}
                  />
                </div>

                {/* Nome de Usuário */}
                <div className="space-y-3">
                  <div className="flex flex-col">
                    <label className="text-base font-medium text-foreground">Nome de usuário</label>
                    <span className="text-[13px] text-muted-foreground mt-1">Uma palavra, como um apelido</span>
                  </div>
                  <Input
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    onBlur={() => !username.trim() && error('Seu nome de usuário não pode estar vazio.')}
                    className={`bg-muted/50 border-border h-14 rounded-xl font-space text-base transition-all ${!username.trim() ? 'border-red-500/50 focus-visible:ring-red-500/20' : ''}`}
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-primary text-white px-10 h-12 rounded-xl font-bold uppercase tracking-widest text-sm hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-60"
                  >
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : tab === 'Geral' ? (
          <div className="max-w-2xl mx-auto">
            <div className="mb-8 text-center lg:text-left">
              <h2 className="text-4xl font-bold font-space">Geral</h2>
              <p className="text-muted-foreground mt-2">Nome e avatar</p>
            </div>
            <Card className="border-border bg-card shadow-sm overflow-hidden">
              <CardContent className="p-10 space-y-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <span className="text-lg font-medium text-foreground">Nome</span>

                  <div className="flex items-center gap-6 flex-1 max-w-md">
                    <div className="relative shrink-0">
                      <Avatar className="w-14 h-14 border-2 border-background shadow-sm">
                        {previewSrc && <AvatarImage src={previewSrc} />}
                        <AvatarFallback className="bg-muted text-foreground">{initial}</AvatarFallback>
                      </Avatar>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute -right-1 -bottom-1 w-7 h-7 bg-muted rounded-full flex items-center justify-center cursor-pointer shadow-sm border border-border hover:bg-muted/80 transition-colors"
                        aria-label="Alterar foto de perfil"
                      >
                        <Camera className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={onPickFile}
                      />
                    </div>
                    <Input
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      onBlur={() => !fullName.trim() && error('Seu nome completo não pode estar vazio.')}
                      className={`bg-muted/50 border-border h-14 rounded-xl font-space text-base flex-1 transition-all ${!fullName.trim() ? 'border-red-500/50 focus-visible:ring-red-500/20' : ''}`}
                      placeholder="Seu nome"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-start">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-primary text-white px-8 h-12 rounded-xl font-bold uppercase tracking-widest text-sm hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-60"
                  >
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </div>

                {/* Integrações Instagram */}
                <div className="pt-8 border-t border-border space-y-3">
                  <div>
                    <h3 className="text-base font-bold">Integrações Instagram</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Atualize o cache de posts para popular gráficos de "Interações por Conteúdo" e "Vídeos Mais Relevantes".
                    </p>
                  </div>
                  <Button
                    onClick={refreshIGCache}
                    disabled={refreshingCache || !profile?.client?.ig_user_id}
                    variant="outline"
                    className="border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${refreshingCache ? 'animate-spin' : ''}`} />
                    {refreshingCache ? 'Atualizando...' : 'Atualizar Cache de Posts'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="border-border bg-card shadow-sm h-full min-h-[500px] flex flex-col items-center justify-center text-center p-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">Notificações</h3>
            <p className="text-muted-foreground max-w-md">
              Configurações de <strong>Notificações</strong> em desenvolvimento.
            </p>
          </Card>
        )}
      </motion.div>
    </div>
  )
}
