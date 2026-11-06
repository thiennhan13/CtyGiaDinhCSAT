import Image from 'next/image';
import tutors from '@/lib/public-team.json';
import './tutor-directory.css';

export function TutorDirectory() {
  return <section className="tutor-directory section wrap" aria-labelledby="directory-title">
    <h2 id="directory-title">Gặp các gia sư CSAT</h2>
    <div className="tutor-directory-list">{tutors.map(tutor => <article className="tutor-directory-profile" key={tutor.username}>
      <header>
        <Image src={tutor.image} alt={tutor.name} width={96} height={96} sizes="(max-width:600px) 72px, 96px" />
        <div><h3>{tutor.name}</h3><p>{tutor.cohort && tutor.cohort + ' · '}{tutor.school}</p></div>
      </header>
      <div className="tutor-directory-details">
        {tutor.university && <p className="tutor-directory-university">{tutor.university}</p>}
        {tutor.username && <p className="tutor-directory-username"><span>Username CSATOJ</span><strong>{tutor.username}</strong></p>}
        <h4>Thành tích</h4><ul>{tutor.achievements.map(item => <li key={item}>{item}</li>)}</ul>
      </div>
    </article>)}</div>
  </section>;
}
