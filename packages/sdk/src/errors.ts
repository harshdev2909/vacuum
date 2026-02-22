/**
 * Custom error hierarchy for the Vacuum SDK.
 * All SDK errors extend VacuumError for predictable handling.
 */

/** Base error for all SDK operations. */
export class VacuumError extends Error {
  public readonly code: string;

  constructor(message: string, code: string = "VACUUM_ERROR") {
    super(message);
    this.name = "VacuumError";
    this.code = code;
    Object.setPrototypeOf(this, VacuumError.prototype);
  }
}

/** Thrown when a contract call reverts or returns invalid data. */
export class ContractError extends VacuumError {
  constructor(message: string, public readonly txHash?: string) {
    super(message, "CONTRACT_ERROR");
    this.name = "ContractError";
  }
}

/** Thrown when the signer is missing or invalid for an operation. */
export class SignerError extends VacuumError {
  constructor(message: string = "Signer required for this operation") {
    super(message, "SIGNER_ERROR");
    this.name = "SignerError";
  }
}

/** Thrown when a parameter is invalid or out of range. */
export class ValidationError extends VacuumError {
  constructor(message: string, public readonly field?: string) {
    super(message, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

/** Thrown when a simulation or preflight check fails. */
export class SimulationError extends VacuumError {
  constructor(message: string) {
    super(message, "SIMULATION_ERROR");
    this.name = "SimulationError";
  }
}

/** Thrown when RiskGuard or policy prevents execution. */
export class PolicyError extends VacuumError {
  constructor(message: string) {
    super(message, "POLICY_ERROR");
    this.name = "PolicyError";
  }
}
