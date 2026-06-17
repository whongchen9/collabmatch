import { useParams, useNavigate } from 'react-router-dom';
import { useTeamChat } from '@/hooks/useTeamChat';
import InlinePanel from '@/components/InlinePanel';
import ChatHeader from '@/components/team-chat/ChatHeader';
import ChatMessages from '@/components/team-chat/ChatMessages';
import SidebarButtons from '@/components/team-chat/SidebarButtons';
import MemberPanel, { MemberModal } from '@/components/team-chat/MemberPanel';
import PlanPanel from '@/components/team-chat/PlanPanel';
import PhotoPanel from '@/components/team-chat/PhotoPanel';
import MatchPanel from '@/components/team-chat/MatchPanel';
import LocationPanel from '@/components/team-chat/LocationPanel';
import GoModal from '@/components/team-chat/GoModal';
import CompleteModal from '@/components/team-chat/CompleteModal';
import NoCheckpointModal from '@/components/team-chat/NoCheckpointModal';
import PromptsConfirmModal from '@/components/team-chat/PromptsConfirmModal';

export default function TeamChat() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const chat = useTeamChat(id);

  if (!chat.group) return (
    <div className="flex flex-col items-center justify-center h-screen gap-3 bg-[#faf7f2] dark:bg-gray-950">
      {chat.loadError ? (
        <>
          <p className="text-red-400 text-sm">{chat.loadError}</p>
          <button onClick={() => { chat.loadGroup(); }} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">重试</button>
          <button onClick={() => navigate('/')} className="text-gray-400 dark:text-gray-500 text-xs">返回首页</button>
        </>
      ) : (
        <p className="text-gray-400 dark:text-gray-500">加载中...</p>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-[#faf7f2] dark:bg-gray-950">
      {/* Header */}
      <ChatHeader
        group={chat.group}
        isLeader={chat.isLeader}
        isVisitor={chat.isVisitor}
        hikeStatus={chat.hikeStatus}
        checkpoints={chat.checkpoints}
        checkedInCount={chat.checkedInCount}
        photos={chat.photos}
        members={chat.members}
        went={chat.hikeStatus === 'hiking'}
        showGoModal={chat.showGoModal}
        showNoCheckpointModal={chat.showNoCheckpointModal}
        hikingActionLoading={chat.hikingActionLoading}
        showCheckpointGuide={chat.showCheckpointGuide}
        onGo={chat.handleGo}
        onComplete={chat.handleComplete}
        onDismissGuide={() => {
          localStorage.setItem('trailmate_guide_checkpoints', 'dismissed');
          chat.setShowCheckpointGuide(false);
        }}
        onNavigate={(path) => navigate(path)}
        onGoBack={() => navigate(-1)}
        onApplyJoin={async () => {
          const ok = await chat.confirmDialog({ title: '申请加入', message: `确认申请加入「${chat.group?.name || '未命名'}」？` });
          if (!ok) return;
          try {
            const res = await (await import('@/api')).groupsApi.applyJoin(chat.id!);
            chat.showToast(res.message || '申请已发送');
            navigate('/teams');
          } catch (err: any) { chat.showToast(err.message || '申请失败'); }
        }}
        merging={chat.merging}
        showToast={chat.showToast}
        sidebarExpanded={chat.sidebarExpanded}
        onToggleSidebar={() => chat.setSidebarExpanded(!chat.sidebarExpanded)}
      />

      {/* 聊天区 + 左侧浮动按钮 — 仅队员可见 */}
      {chat.isVisitor ? (
        <PlanPanel
          group={chat.group}
          isLeader={false}
          isMember={false}
          editingPlan={false}
          planEditorRef={chat.planEditorRef}
          onSavePlan={() => {}}
          onCancelPlan={() => {}}
          editingPrompts={false}
          editPromptsText=""
          setEditPromptsText={() => {}}
          onSavePrompts={() => {}}
          onCancelPrompts={() => {}}
          onShowPromptsConfirm={() => {}}
          groupPrompts={chat.groupPrompts}
          intentRawInput={chat.intentRawInput}
          matchingEnabled={false}
          onToggleMatching={() => {}}
          matchedUsers={[]}
          matchTeams={[]}
          onInvite={() => {}}
          onApplyJoin={() => {}}
          onBack={() => navigate('/')}
          onCompleteTeam={() => {}}
        />
      ) : (
      <div className="flex-1 min-h-0 relative flex flex-col">
        {!chat.isVisitor && (
          <SidebarButtons
            sidebarPanel={chat.sidebarPanel}
            onToggle={(panel) => chat.setSidebarPanel(panel as any)}
            memberCount={chat.members.length}
            photoCount={(chat.group?.photos || []).length}
            hikeStatus={chat.hikeStatus}
            isLeader={chat.isLeader}
            onSOS={chat.handleSOS}
            onLeave={chat.handleLeave}
            closeAllModals={chat.closeAllModals}
            expanded={chat.sidebarExpanded}
          />
        )}
        <ChatMessages
          messages={chat.group.messages || []}
          user={chat.user}
          msg={chat.msg}
          setMsg={chat.setMsg}
          onSend={chat.handleSend}
          sending={chat.sending}
          bottomRef={chat.bottomRef}
          onAiAssistant={chat.handleAiAssistant}
          aiAssistantLoading={chat.aiAssistantLoading}
          pendingBulletin={chat.pendingBulletin}
          onConfirmBulletin={chat.confirmBulletin}
          onDismissBulletin={() => chat.setPendingBulletin(null)}
          onImageUpload={chat.handleImageUpload}
          imageInputRef={chat.imageInputRef}
          hikeStatus={chat.hikeStatus}
          isVisitor={chat.isVisitor}
        />
      </div>
      )}

      {/* ═══ 侧边栏 ═══ */}
      <InlinePanel title={`成员 (${chat.members.length})`} visible={chat.sidebarPanel === 'members'} onClose={() => chat.setSidebarPanel(null)}>
        <MemberPanel
          members={chat.members}
          checkpoints={chat.checkpoints}
          hikeStatus={chat.hikeStatus}
          user={chat.user}
          isLeader={chat.isLeader}
          onSelectMember={(member) => { chat.setSelectedMember(member); chat.setShowMemberModal(true); }}
        />
      </InlinePanel>

      {/* PlanPanel 自带头部，直接渲染不用 InlinePanel 包装 */}
      {chat.sidebarPanel === 'plan' && (
        <div
          className="absolute z-30 bg-[#faf7f2] dark:bg-gray-950 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-slide-in-right"
          style={{
            right: '52px',
            top: '60px',
            bottom: '80px',
            left: '12px',
            maxWidth: 'calc(100% - 60px)',
          }}
        >
          <PlanPanel
            group={chat.group}
            isLeader={chat.isLeader}
            isMember={chat.isMember}
            editingPlan={chat.editingPlan}
            planEditorRef={chat.planEditorRef}
            onSavePlan={chat.handleSavePlan}
            onCancelPlan={() => chat.setEditingPlan(!chat.editingPlan)}
            editingPrompts={chat.editingPrompts}
            editPromptsText={chat.editPromptsText}
            setEditPromptsText={chat.setEditPromptsText}
            onSavePrompts={chat.handleSavePrompts}
            onCancelPrompts={() => chat.setEditingPrompts(false)}
            onShowPromptsConfirm={() => chat.setShowPromptsConfirm(true)}
            groupPrompts={chat.groupPrompts}
            intentRawInput={chat.intentRawInput}
            matchingEnabled={chat.matchingEnabled}
            onToggleMatching={async (v) => {
              chat.setMatchingEnabled(v);
              try { await (await import('@/api')).groupsApi.update(chat.id!, { matchingEnabled: v }); } catch {}
            }}
            matchedUsers={chat.matchedUsers}
            matchTeams={chat.matchTeams}
            onInvite={async (userId: string) => {
              if (!chat.group?.intentId) return;
              try {
                await (await import('@/api')).intentApi.confirmTeam(chat.group.intentId, [userId]);
                chat.showToast('邀请已发送！');
                chat.loadGroup();
              } catch (err: any) { chat.showToast(err.message || '邀请失败'); }
            }}
            onApplyJoin={async (team: any) => {
              const ok = await chat.confirmDialog({ title: '申请加入', message: `确认申请加入「${team.name || '未命名'}」？` });
              if (!ok) return;
              try {
                const res = await (await import('@/api')).groupsApi.applyJoin(team.id);
                chat.showToast(res.message || '申请已发送');
                if (chat.members.length <= 1) {
                  try { await (await import('@/api')).groupsApi.leave(chat.id!); } catch {}
                  navigate('/teams');
                }
              } catch (err: any) { chat.showToast(err.message || '申请失败'); }
            }}
            onBack={() => chat.setSidebarPanel(null)}
            onCompleteTeam={() => chat.setSidebarPanel(null)}
            onClose={() => chat.setSidebarPanel(null)}
          />
        </div>
      )}
      {/* PhotoPanel 相册 */}
      {chat.sidebarPanel === 'photo' && (
        <div
          className="absolute z-30 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-slide-in-right"
          style={{
            right: '52px',
            top: '60px',
            bottom: '80px',
            left: '12px',
            maxWidth: 'calc(100% - 60px)',
          }}
        >
          <PhotoPanel
            photos={chat.photos}
            uploading={chat.uploadingPhoto}
            isLeader={chat.isLeader}
            onUpload={async (file) => {
              chat.setUploadingPhoto(true);
              try {
                // canvas 压缩到 800px
                const compressed = await new Promise<string>((resolve) => {
                  const img = new Image();
                  img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let w = img.width, h = img.height;
                    if (w > 800) { h = (h / w) * 800; w = 800; }
                    canvas.width = w; canvas.height = h;
                    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                  };
                  img.src = URL.createObjectURL(file);
                });
                const newPhotos = [...(chat.group?.photos || []), compressed];
                await (await import('@/api')).groupsApi.update(chat.id!, { photos: newPhotos });
                await chat.loadGroup();
              } catch (err: any) {
                chat.showToast(err.message || '上传失败');
              } finally {
                chat.setUploadingPhoto(false);
              }
            }}
            onDelete={async (index) => {
              const ok = await chat.confirmDialog({ title: '删除照片', message: '确定要删除这张照片吗？' });
              if (!ok) return;
              try {
                const newPhotos = chat.photos.filter((_, j) => j !== index);
                await (await import('@/api')).groupsApi.update(chat.id!, { photos: newPhotos });
                await chat.loadGroup();
              } catch (err: any) {
                chat.showToast(err.message || '删除失败');
              }
            }}
          />
          {/* 关闭按钮 */}
          <button
            onClick={() => chat.setSidebarPanel(null)}
            className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-black/20 dark:bg-white/10 flex items-center justify-center text-white hover:bg-black/40 transition-colors z-10"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      )}

      <InlinePanel title="匹配" visible={chat.sidebarPanel === 'match'} onClose={() => chat.setSidebarPanel(null)}>
        <MatchPanel
          matchTab={chat.matchTab}
          setMatchTab={chat.setMatchTab}
          matchedUsers={chat.matchedUsers}
          matchTeams={chat.matchTeams}
          matchingEnabled={chat.matchingEnabled}
          onToggleMatching={async (v) => {
            chat.setMatchingEnabled(v);
            try { await (await import('@/api')).groupsApi.update(chat.id!, { matchingEnabled: v }); } catch {}
          }}
          isLeader={chat.isLeader}
          onInvite={async (userId: string) => {
            if (!chat.group?.intentId) return;
            try {
              await (await import('@/api')).intentApi.confirmTeam(chat.group.intentId, [userId]);
              chat.showToast('邀请已发送！');
              chat.loadGroup();
            } catch (err: any) { chat.showToast(err.message || '邀请失败'); }
          }}
          onMergeTeam={(team) => chat.handleMergeTeam(team)}
          onApplyJoin={async (team: any) => {
            const ok = await chat.confirmDialog({ title: '申请加入', message: `确认申请加入「${team.name || '未命名'}」？` });
            if (!ok) return;
            try {
              const res = await (await import('@/api')).groupsApi.applyJoin(team.id);
              chat.showToast(res.message || '申请已发送');
              // 如果当前队伍只有自己一人，自动退出旧队伍
              if (chat.members.length <= 1) {
                try { await (await import('@/api')).groupsApi.leave(chat.id!); } catch {}
                navigate('/teams');
              }
            } catch (err: any) { chat.showToast(err.message || '申请失败'); }
          }}
          merging={chat.merging}
          mergeConfirmTeam={chat.mergeConfirmTeam}
          myLeaderTeams={chat.myLeaderTeams}
          selectedFromTeamId={chat.selectedFromTeamId}
          setSelectedFromTeamId={chat.setSelectedFromTeamId}
          doApplyMerge={chat.doApplyMerge}
          onCancelMerge={() => { chat.setMergeConfirmTeam(null); }}
          editingPrompts={chat.editingPrompts}
          editPromptsText={chat.editPromptsText}
          setEditPromptsText={chat.setEditPromptsText}
          onSavePrompts={chat.handleSavePrompts}
          onCancelPrompts={() => chat.setEditingPrompts(false)}
          onShowPromptsConfirm={() => chat.setShowPromptsConfirm(true)}
          groupPrompts={chat.groupPrompts}
        />
      </InlinePanel>

      <InlinePanel title="位置分享" visible={chat.sidebarPanel === 'location'} onClose={() => chat.setSidebarPanel(null)}>
        <LocationPanel
          checkpoints={chat.checkpoints}
          members={chat.members}
          userPos={chat.userPos}
          hikeStatus={chat.hikeStatus}
          user={chat.user}
          isMember={chat.isMember}
          onOpenFullMap={() => { chat.setSidebarPanel(null); navigate(`/location/${id}`); }}
        />
      </InlinePanel>

      {/* ═══ 弹窗 ═══ */}
      {chat.showGoModal && (
        <GoModal
          checkpoints={chat.checkpoints}
          members={chat.members}
          countdown={chat.countdown}
          hikingActionLoading={chat.hikingActionLoading}
          isLeader={chat.isLeader}
          onStartCountdown={chat.startCountdown}
          onCancelCountdown={chat.cancelCountdown}
          onClose={() => { chat.setShowGoModal(false); chat.closeAllModals(); }}
        />
      )}

      {chat.showCompleteModal && (
        <CompleteModal
          checkpoints={chat.checkpoints}
          photos={chat.photos}
          completeTrackStats={chat.completeTrackStats}
          hikingActionLoading={chat.hikingActionLoading}
          isLeader={chat.isLeader}
          onConfirm={chat.doComplete}
          onClose={() => chat.setShowCompleteModal(false)}
        />
      )}

      {chat.showNoCheckpointModal && (
        <NoCheckpointModal
          onClose={() => chat.setShowNoCheckpointModal(false)}
          onGoToMap={() => { chat.setShowNoCheckpointModal(false); navigate(`/location/${id}`); }}
        />
      )}

      {chat.showPromptsConfirm && (
        <PromptsConfirmModal
          editPromptsText={chat.editPromptsText}
          onConfirm={chat.handleSavePrompts}
          onCancel={() => chat.setShowPromptsConfirm(false)}
        />
      )}

      {chat.showMemberModal && chat.selectedMember && (
        <MemberModal
          member={chat.selectedMember}
          isLeader={chat.isLeader}
          userId={chat.user?.id}
          onTransferLeader={chat.handleTransferLeader}
          onViewProfile={(userId) => {
            navigate(`/profile/${userId}`);
            chat.setShowMemberModal(false);
            chat.setSelectedMember(null);
          }}
          onClose={() => { chat.setShowMemberModal(false); chat.setSelectedMember(null); }}
        />
      )}

      {chat.ConfirmDialog}
    </div>
  );
}
