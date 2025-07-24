import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ContentData {
  home: {
    title: string;
    subtitle: string;
    btn1Text: string;
    btn2Text: string;
    bgImage?: string;
  };
  about: {
    title: string;
    description: string;
    image?: string;
  };
  features: {
    title: string;
    subtitle: string;
    cards: {
      title: string;
      description: string;
      icon?: string;
    }[];
  };
}

@Injectable({
  providedIn: 'root'
})

export class ContentManagementService {

  // constructor() { }
  private contentData: ContentData = {
    home: {
      title: "Product Purchase & Inventory Management",
      subtitle: "A smart system for inventory tracking and automated purchases, providing real-time insights, reducing errors, optimizing procurement, and improving efficiency.",
      btn1Text: "Create your Account",
      btn2Text: "Free Demo"
    },
    about: {
      title: "About Us",
      description: "Welcome to our Inventory Management System, a streamlined solution designed to simplify inventory control. Our platform helps businesses efficiently manage stock, orders, suppliers, and sales with real-time updates and analytics. With features like low-stock alerts, order tracking, and comprehensive reports, we empower businesses to make informed decisions, enhance productivity, and drive growth. Experience seamless inventory management with us!"
    },
    features: {
      title: "All the features you'll ever need to manage your business",
      subtitle: "Give us a try, There's nothing to install, No training manuals needed, No commitments.",
      cards: [
        {
          title: "Inventory Management",
          description: "The easiest and most beautiful inventory you've ever seen.",
          icon: "IM.png"
        },
        {
          title: "Invoices & Estimates",
          description: "Create estimates and invoices then let StockEasy do the rest.",
          icon: "IE.png"
        },
        {
          title: "Report Generating",
          description: "Extremely detailed reports for your inventory, sales, and services.",
          icon: "RG.png"
        },
        {
          title: "Purchase Orders",
          description: "Replenish stock levels, track when they should arrive.",
          icon: "PR.png"
        },
        {
          title: "Item Variation",
          description: "Organize inventory items using custom attributes.",
          icon: "IV.png"
        },
        {
          title: "User Permission",
          description: "Finely tune what each of your team members can see and do.",
          icon: "UP.png"
        }
      ]
    }
  };

  private contentSubject = new BehaviorSubject<ContentData>(this.contentData);
  content$ = this.contentSubject.asObservable();

  constructor() {}

  getCurrentContent(): ContentData {
    return {...this.contentData};
  }

  updateContent(newContent: ContentData): void {
    this.contentData = {...newContent};
    this.contentSubject.next(this.contentData);
  }
}


