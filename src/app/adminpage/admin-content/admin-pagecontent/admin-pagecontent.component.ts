import { CommonModule } from '@angular/common';
import {  Component,  } from '@angular/core';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-admin-pagecontent',
  standalone: true,
  imports: [CommonModule,FormsModule],
  templateUrl: './admin-pagecontent.component.html',
  styleUrl: './admin-pagecontent.component.css'
})
export class AdminPagecontentComponent {

  activeTab: 'home' | 'about' | 'features' = 'home';
  
  // Content data model
  contentData = {
    home: {
      title: "Product Purchase & Inventory Management",
      subtitle: "A smart system for inventory tracking and automated purchases, providing real-time insights, reducing errors, optimizing procurement, and improving efficiency.",
      btn1Text: "Create your Account",
      btn2Text: "Free Demo",
      bgImage: '',
      
    },
    about: {
      title: "About Us",
      description: "Welcome to our Inventory Management System, a streamlined solution designed to simplify inventory control. Our platform helps businesses efficiently manage stock, orders, suppliers, and sales with real-time updates and analytics.",
      image: ''
    },
    features: {
      title: "All the features you'll ever need to manage your business",
      subtitle: "Give us a try, There's nothing to install, No training manuals needed, No commitments.",
      cards: [
        {
          title: "Inventory Management",
          description: "The easiest and most beautiful inventory you've ever seen.",
          icon: ''
        },
        {
          title: "Invoices & Estimates",
          description: "Create estimates and invoices then let StockEasy do the rest.",
          icon: ''
        }
      ]
    }
  };

  // Image previews
  homeBgImagePreview?: string;
  aboutImagePreview?: string;
  featureIconsPreview: string[] = [];
  showSaveSuccess = false;

  showTab(tab: 'home' | 'about' | 'features'): void {
    this.activeTab = tab;
  }

  onHomeBgImageChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.homeBgImagePreview = e.target?.result as string;
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  onAboutImageChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.aboutImagePreview = e.target?.result as string;
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  onFeatureIconChange(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.featureIconsPreview[index] = e.target?.result as string;
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  addFeatureCard(): void {
    this.contentData.features.cards.push({
      title: 'New Feature',
      description: 'Feature description goes here',
      icon: ''
    });
    this.featureIconsPreview.push('');
  }

  removeFeatureCard(index: number): void {
    if (confirm('Are you sure you want to remove this feature card?')) {
      this.contentData.features.cards.splice(index, 1);
      this.featureIconsPreview.splice(index, 1);
    }
  }

  saveChanges(): void {
    if (confirm('Are you sure you want to save these changes?')) {
      // In a real app, you would send data to a service here
      console.log('Saving data:', this.contentData);
      
      // Show success message
      this.showSaveSuccess = true;
      setTimeout(() => this.showSaveSuccess = false, 3000);
    }
  }
}


