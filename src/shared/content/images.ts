import ambassador1 from '@/assets/images/ambassador1.jpg'
import ambassador2 from '@/assets/images/ambassador2.jpg'
import businessMen from '@/assets/images/business-men.jpg'
import businessWomen from '@/assets/images/business-women.jpg'
import handshake from '@/assets/images/handshake.jpg'
import officeMeeting from '@/assets/images/office-meeting.jpg'
import officeStaff from '@/assets/images/office-staff1.jpg'
import supportStaff from '@/assets/images/support-staff.jpg'
import products from '@/assets/images/products.jpg'
import graduation from '@/assets/images/graduation.jpg'


/**
 * Local production imagery for public marketing surfaces (MH-FE-019).
 * `cart-on-keyboard.jpg` is intentionally unused — too stock/literal for brand pages.
 */
export const images = {
  hero: {
    src: businessWomen,
    alt: 'Business professionals collaborating in a modern office',
  },
  ambassadors: {
    src: ambassador2,
    alt: 'Independent ambassador ready to promote commercial opportunities',
  },
  ambassadorsSecondary: {
    src: ambassador1,
    alt: 'Ambassador connecting with customers in a commercial setting',
  },
  business: {
    src: businessMen,
    alt: 'Business leaders reviewing commercial plans together',
  },
  collaboration: {
    src: handshake,
    alt: 'Handshake closing a Business and Ambassador partnership',
  },
  about: {
    src: officeMeeting,
    alt: 'Team meeting in a professional workspace',
  },
  office: {
    src: officeStaff,
    alt: 'Office colleagues working together',
  },
  products: {
    src: products,
    alt: 'Products displayed in a modern office',
  },
  graduation: {
    src: graduation,
    alt: 'Graduation ceremony in a modern office',
  },
  support: {
    src: supportStaff,
    alt: 'Support specialist ready to assist participants',
  },
} as const
