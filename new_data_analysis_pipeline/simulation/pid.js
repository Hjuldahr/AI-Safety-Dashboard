export class PID {
  constructor(kp, ki, kd, dt = 1) {
    this.kp = kp;
    this.ki = ki;
    this.kd = kd;
    this.dt = dt;

    this.integral = 0;
    this.prevError = 0;
  }

  update(setpoint, measured) {
    const error = setpoint - measured;
    this.integral += error * this.dt;
    const derivative = (error - this.prevError) / this.dt;
    this.prevError = error;

    return (
      this.kp * error +
      this.ki * this.integral +
      this.kd * derivative
    );
  }
}