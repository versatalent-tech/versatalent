import { MainLayout } from "@/components/layout/MainLayout";

export default function AboutPage() {
  return (
    <MainLayout>
      <div className="bg-black py-16 md:py-24">
        <div className="container px-4 mx-auto">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold text-white mb-6">About <span className="text-gold">VersaTalent</span></h1>

            <div className="prose prose-invert max-w-none">
              <h2 className="text-2xl font-semibold mb-4 mt-8">Our Mission & Vision</h2>
              <p className="text-gray-300 mb-6">
                At VersaTalent, our mission is to discover, develop, and promote exceptional talent across various creative industries.
                We believe in the power of authentic representation and are committed to helping our clients find opportunities that align
                with their unique abilities and career aspirations.
              </p>
              <p className="text-gray-300 mb-6">
                Our vision is to be the most trusted and innovative talent agency in the industry, known for our personalized approach,
                integrity, and the consistent quality of our talent roster.
              </p>

              <h2 className="text-2xl font-semibold mb-4 mt-8">Our Story</h2>
              <p className="text-gray-300 mb-6">
                Founded in 2023, VersaTalent emerged from a recognition of the need for a more holistic and adaptable approach to talent
                management. In an era where creative professionals often cross traditional industry boundaries, our agency was built to
                support diverse talents and connect them with opportunities that showcase their full potential.
              </p>
              <p className="text-gray-300 mb-6">
                Our founders bring decades of combined experience across entertainment, hospitality, and sports industries, allowing us
                to offer insights and connections that span multiple sectors.
              </p>

              <h2 className="text-2xl font-semibold mb-4 mt-8">Our Values</h2>
              <ul className="space-y-4 text-gray-300 mb-8">
                <li>
                  <strong className="text-gold">Authenticity:</strong> We encourage our talent to embrace what makes them unique, and we represent them with honesty and transparency.
                </li>
                <li>
                  <strong className="text-gold">Excellence:</strong> We maintain the highest standards in both our talent selection and our business practices.
                </li>
                <li>
                  <strong className="text-gold">Innovation:</strong> We constantly seek new opportunities and creative approaches to talent representation.
                </li>
                <li>
                  <strong className="text-gold">Diversity:</strong> We celebrate diversity in all forms and are committed to inclusive representation.
                </li>
                <li>
                  <strong className="text-gold">Relationships:</strong> We value long-term partnerships with both our talent and our industry connections.
                </li>
              </ul>

              <h2 className="text-2xl font-semibold mb-4 mt-8">Our Team</h2>
              <p className="text-gray-300">
                VersaTalent is powered by a dedicated team of industry professionals who are passionate about discovering and nurturing talent.
                Our agents bring specialized knowledge from their respective fields, allowing us to provide expert guidance across multiple industries.
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
