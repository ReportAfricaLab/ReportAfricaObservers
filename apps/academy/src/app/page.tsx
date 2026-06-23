'use client';
import { useState, useEffect } from 'react';
import { getLocalPrice } from '@/lib/courses';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.reportafrica.africa/api/v1';

export default function AcademyHome() {
  const [user, setUser] = useState<any>(null);
  const [country, setCountry] = useState('NG');
  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('academy_user');
    if (stored) { const u = JSON.parse(stored); setUser(u); setCountry(u.country || 'NG'); }
    // Fetch published courses from API
    fetch(`${API_URL}/courses`).then(r => r.json()).then(data => {
      if (Array.isArray(data)) setCourses(data);
    }).catch(() => {});
  }, []);

  // Bundle price fixed at $40
  const bundleUsd = 40;
  const bundle = getLocalPrice(bundleUsd, country);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Become a Professional Citizen Journalist</h1>
        <p className="text-gray-500 max-w-xl mx-auto">Master mobile reporting, safety protocols, verification techniques, and live broadcasting. Earn your ReportAfrica certification.</p>
        {!user && <p className="mt-4 text-sm text-amber-600">💡 <a href="https://reportafrica.africa/login" className="underline">Log in to ReportAfrica</a> to access courses with your account.</p>}
      </div>

      {/* Bundle */}
      {courses.length > 1 && (
        <div className="bg-gradient-to-r from-[#0F7B6C] to-[#0B6E4F] rounded-2xl p-8 text-white text-center mb-10">
          <p className="text-sm opacity-80 mb-1">BEST VALUE</p>
          <h2 className="text-2xl font-bold mb-2">Full Bundle — All {courses.length} Courses</h2>
          <p className="text-4xl font-bold">{bundle.currency} {bundle.price.toLocaleString()}</p>
          <p className="text-sm opacity-70 mt-1">Save 40% compared to buying individually</p>
          <a href="/course/bundle" className="inline-block mt-4 px-8 py-3 bg-white text-[#0F7B6C] font-semibold rounded-lg hover:bg-gray-100 transition">Get Full Bundle</a>
        </div>
      )}

      {/* Individual Courses */}
      <div className="grid gap-6 sm:grid-cols-2">
        {courses.map((course) => {
          const { price, currency } = getLocalPrice(Number(course.usdPrice), country);
          return (
            <a key={course.id} href={`/course/${course.id}`} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md hover:border-gray-300 transition block">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{course.icon}</span>
                <div>
                  <h3 className="font-bold text-gray-900">{course.title}</h3>
                  <p className="text-xs text-gray-500">{course.lessons?.length || 0} lessons</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{course.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-gray-900">{currency} {price.toLocaleString()}</span>
                <span className="text-xs px-3 py-1 bg-[#0F7B6C] text-white rounded-full font-medium">View Course →</span>
              </div>
            </a>
          );
        })}
      </div>

      {courses.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🎓</p>
          <p>Courses coming soon. Check back later!</p>
        </div>
      )}
    </div>
  );
}

