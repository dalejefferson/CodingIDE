/**
 * IPC Contract Definitions — Single Source of Truth
 *
 * Every IPC channel must be declared here with:
 * 1. Channel constant (IPC_CHANNELS)
 * 2. Type contract (IPCContracts)
 * 3. Runtime validator (IPC_VALIDATORS)
 *
 * Validation approach: manual type guards (zero dependencies).
 * Rationale: all current payloads are void — manual guards are trivially
 * correct and keep the bundle small. Switch to zod when payloads grow
 * complex enough to warrant a schema library.
 */

// Barrel re-export — all consumers continue importing from '@shared/ipcContracts'
export * from './ipc/channels'
export * from './ipc/contracts'
export * from './ipc/validators'

// Re-export domain validators for test access
export {
  isCreateTicketRequest,
  isUpdateTicketRequest,
  isTransitionTicketRequest,
  isReorderTicketRequest,
  isGeneratePRDRequest,
  isApprovePRDRequest,
  isRalphExecuteRequest,
  isRalphStatusRequest,
  isRalphStopRequest,
  isOpenTicketAsProjectRequest,
} from './ticketValidators'

export {
  isFileCreateRequest,
  isFileReadRequest,
  isFileWriteRequest,
  isFileListRequest,
} from './fileOpsValidators'

export {
  isCreateMobileAppRequest,
  isAddMobileAppRequest,
  isStartExpoRequest,
  isStopExpoRequest,
  isExpoStatusRequest,
  isOpenMobileAppAsProjectRequest,
  isGenerateMobilePRDRequest,
  isSavePRDRequest,
  isCopyPRDImagesRequest,
} from './expoValidators'

export { isGenerateWordVomitPRDRequest } from './wordVomitValidators'

export { isCreateIdeaRequest, isUpdateIdeaRequest } from './ideaValidators'
