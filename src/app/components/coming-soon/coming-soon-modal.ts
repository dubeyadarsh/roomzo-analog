import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-coming-soon-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="modal-container">
      <div class="modal-icon">
        <mat-icon>location_city</mat-icon>
      </div>
      <h2>RoomZo is coming to <span class="highlight">Pune</span> soon!</h2>
      <p>We’re preparing the best verified rooms, PGs, and flatmates for you.<br>
         You will see the update soon, stay tuned.</p>
      <div class="modal-actions">
        <!-- <button class="btn-notify" (click)="notify()">
          <mat-icon>notifications_active</mat-icon> Notify Me
        </button> -->
        <button class="btn-close" (click)="close()">Close</button>
      </div>
    </div>
  `,
  styles: [`
    .modal-container {
      text-align: center;
      padding: 24px;
      max-width: 450px;
    }
    .modal-icon {
      background: linear-gradient(135deg, #f59e0b, #ea580c);
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
    }
    .modal-icon mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: white;
    }
    h2 {
      font-size: 1.8rem;
      margin: 0 0 12px;
    }
    .highlight {
      background: linear-gradient(135deg, #f59e0b, #ea580c);
      background-clip: text;
      -webkit-background-clip: text;
      color: transparent;
    }
    p {
      color: #4b5563;
      margin-bottom: 28px;
      line-height: 1.5;
    }
    .modal-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }
    .btn-notify, .btn-close {
      border: none;
      padding: 10px 20px;
      border-radius: 40px;
      font-weight: 600;
      cursor: pointer;
      transition: 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .btn-notify {
      background: linear-gradient(135deg, #f59e0b, #ea580c);
      color: white;
    }
    .btn-notify:hover {
      transform: scale(1.02);
    }
    .btn-close {
      background: #f1f5f9;
      color: #334155;
      min-width: 40px;
    }
    .btn-close:hover {
      background: #e2e8f0;
    }
  `]
})
export class ComingSoonModalComponent {
  constructor(
    public dialogRef: MatDialogRef<ComingSoonModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  notify() {
    alert('🎉 Thank you! We’ll notify you as soon as RoomZo launches in Pune.');
    this.dialogRef.close();
  }

  close() {
    this.dialogRef.close();
  }
}