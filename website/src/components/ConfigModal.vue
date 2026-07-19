<template>
  <Teleport to="body">
    <div class="config-backdrop" @click.self="emit('close')">
      <div
        ref="dialogRef"
        class="config-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shared-list-title"
        tabindex="-1"
        @keydown="handleDialogKeydown"
      >
        <header class="config-header">
          <div>
            <p class="eyebrow">Shared list</p>
            <h2 id="shared-list-title">Add this list to Ohana TV</h2>
            <p>{{ userStore.isLoggedIn ? 'Add the shared list to your profile so it appears in Discover and Settings.' : 'Create or restore a profile first, then Ohana will add the shared list.' }}</p>
          </div>
          <button class="config-close" type="button" @click="emit('close')" aria-label="Close shared list dialog">✕</button>
        </header>

        <p v-if="inviteError" class="form-error">{{ inviteError }}</p>
        <p v-else-if="inviteAdded" class="success-note">Shared list added.</p>

        <div v-if="userStore.isLoggedIn" class="action-stack">
          <button class="btn btn--accent" type="button" :disabled="addingInvite || inviteAdded" @click="acceptInvite">
            {{ addingInvite ? 'Adding…' : inviteAdded ? 'Added' : 'Add shared list' }}
          </button>
          <RouterLink class="btn btn--ghost" to="/settings/lists" @click="emit('close')">Manage lists</RouterLink>
        </div>

        <div v-else class="auth-grid">
          <section class="auth-section">
            <h3>Create profile</h3>
            <label class="field-label" for="new-profile-name">Display name</label>
            <div class="inline-form">
              <input id="new-profile-name" v-model="newName" class="config-input" placeholder="Your name" maxlength="40" @keydown.enter="handleCreate" />
              <button class="btn btn--accent" type="button" :disabled="creating || !newName.trim()" @click="handleCreate">
                {{ creating ? 'Creating…' : 'Create' }}
              </button>
            </div>
          </section>

          <section class="auth-section">
            <h3>Restore profile</h3>
            <label class="field-label" for="import-profile-token">Recovery token</label>
            <div class="inline-form">
              <input id="import-profile-token" v-model="importToken" class="config-input config-input--mono" placeholder="Paste recovery token" @keydown.enter="handleImport" />
              <button class="btn btn--ghost" type="button" :disabled="importing || !importToken.trim()" @click="handleImport">
                {{ importing ? 'Restoring…' : 'Restore' }}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { nextTick, onMounted, onUnmounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { useUserStore } from "@/stores/user.js";
import { lockBodyScroll, unlockBodyScroll, trapTabKey } from "@/composables/modalGuards.js";

const props = defineProps({ pendingListToken: { type: String, required: true } });
const emit = defineEmits(["close"]);

const userStore = useUserStore();
const dialogRef = ref(null);
const previouslyFocused = ref(null);
const newName = ref("");
const importToken = ref("");
const creating = ref(false);
const importing = ref(false);
const addingInvite = ref(false);
const inviteAdded = ref(false);
const inviteError = ref("");

async function acceptInvite() {
  if (!props.pendingListToken || addingInvite.value || inviteAdded.value) return;
  addingInvite.value = true;
  inviteError.value = "";
  try {
    await userStore.addListByToken(props.pendingListToken);
    inviteAdded.value = true;
    setTimeout(() => emit("close"), 700);
  } catch (error) {
    inviteError.value = error.message || "Could not add this shared list.";
  } finally {
    addingInvite.value = false;
  }
}

async function handleCreate() {
  if (!newName.value.trim() || creating.value) return;
  creating.value = true;
  inviteError.value = "";
  try {
    await userStore.createUser(newName.value.trim());
    await acceptInvite();
  } catch (error) {
    inviteError.value = error.message || "Could not create profile.";
  } finally {
    creating.value = false;
  }
}

async function handleImport() {
  if (!importToken.value.trim() || importing.value) return;
  importing.value = true;
  inviteError.value = "";
  try {
    await userStore.importUser(importToken.value.trim());
    await acceptInvite();
  } catch (error) {
    inviteError.value = error.message || "Could not restore profile.";
  } finally {
    importing.value = false;
  }
}

function handleDialogKeydown(event) {
  if (event.key === "Escape") {
    event.preventDefault();
    emit("close");
    return;
  }
  trapTabKey(event, dialogRef.value);
}

onMounted(async () => {
  previouslyFocused.value = document.activeElement;
  lockBodyScroll();
  await nextTick();
  dialogRef.value?.focus({ preventScroll: true });
});

onUnmounted(() => {
  unlockBodyScroll();
  previouslyFocused.value?.focus?.({ preventScroll: true });
});
</script>

<style scoped>
.config-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: grid;
  place-items: center;
  padding: max(18px, env(safe-area-inset-top)) 18px max(18px, env(safe-area-inset-bottom));
  min-height: 100vh;
  min-height: 100dvh;
  overflow-y: auto;
  background: rgba(0, 0, 0, 0.76);
  backdrop-filter: blur(8px);
}

.config-modal {
  width: min(560px, 100%);
  max-width: calc(100vw - 36px);
  padding: 22px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(22, 22, 31, 0.98), rgba(15, 15, 26, 0.98));
  box-shadow: 0 30px 100px rgba(0, 0, 0, 0.5);
  outline: none;
}

.config-header {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;
}

.eyebrow {
  margin-bottom: 6px;
  color: var(--accent);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.config-header h2 {
  font-size: clamp(28px, 6vw, 42px);
  line-height: 1;
}

.config-header p:not(.eyebrow) {
  margin-top: 8px;
  color: var(--muted);
  font-size: 14px;
}

.config-close {
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.04);
  color: var(--muted);
  cursor: pointer;
}

.config-close:hover { color: var(--white); border-color: var(--accent); }

.auth-grid,
.action-stack {
  display: grid;
  gap: 14px;
}

.auth-section {
  display: grid;
  gap: 8px;
}

.auth-section h3 {
  font-size: 17px;
}

.field-label {
  color: rgba(255, 255, 255, 0.72);
  font-size: 13px;
}

.inline-form {
  display: flex;
  gap: 8px;
  align-items: center;
}

.config-input {
  min-width: 0;
  flex: 1;
  padding: 11px 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  background: rgba(8, 8, 16, 0.72);
  color: var(--white);
  font: inherit;
  outline: none;
}

.config-input:focus { border-color: rgba(232, 54, 93, 0.62); }
.config-input--mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; }

.btn {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 14px;
  border: 1px solid transparent;
  border-radius: 12px;
  color: var(--white);
  font-family: var(--font-body);
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
}

.btn:disabled { opacity: 0.45; cursor: not-allowed; }
.btn--accent { background: var(--accent); }
.btn--ghost { background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.13); color: rgba(255, 255, 255, 0.82); }
.btn--ghost:hover:not(:disabled) { border-color: var(--accent); color: var(--white); }

.form-error {
  margin-bottom: 14px;
  color: #fca5a5;
  font-size: 13px;
}

.success-note {
  margin-bottom: 14px;
  color: var(--teal);
  font-size: 14px;
}

@media (max-width: 640px) {
  .config-backdrop { align-items: stretch; padding: 0; }
  .config-modal { min-height: 100dvh; max-width: 100vw; border-radius: 0; border-left: 0; border-right: 0; padding: 20px 16px; }
  .inline-form { align-items: stretch; flex-direction: column; }
  .btn { width: 100%; }
}
</style>
