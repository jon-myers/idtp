<template>
  <div class='outer'>
    <div class='titleRow'>
      <span class='title'>Swara.Studio</span>
      <span class='subtitle'>{{ subtitleText }}</span>
      <div class='buttonRow'>
        <div class='enterButton' @click='goToLogin'>Enter IDTP</div>
        <div class='demosButton'>
          <a href='https://www.youtube.com/channel/UCSsnBpY5Hh8mvZu-63lpmaQ'>
            Demos
          </a>
        </div>
      </div>
    </div>
      <div class='infoRowInner'>
        <div v-for='(item, index) in info' :key='index' class='infoItem'>
          <span class='infoItemHeading'>{{ item.heading }}</span>
          <span class='infoItemText'>{{ item.text }}</span>
        </div>
      </div>
      <div class='sponsorsRowOuter'>
        <div class='sponsorsRow'>
          <div><img :src='logos.neh'></div>
          <div><img :src='logos.or'></div>
          <div><img :src='logos.ari'></div>
          <div><img :src='logos.e'></div>
        </div>
      </div>
      <div class='bottomRow'>
        <div class='bottomRowInner'>
          <div class='chasmsBox'><img :src='logos.chasms'></div>
          <div class='support'>
            <div class='supportTitle'>Support</div>
            <div class='supportRow'>
              <a href='https://github.com/jon-myers/idtp'>Github</a>
            </div>
            <div class='supportRow'>
              <a href='https://github.com/jon-myers/idtp/issues'>
                Github Issues
              </a>
            </div>
            <div class='supportRow'>FAQ</div>
          </div>
          <div class='projectTeam'>
            <div class='projectTeamTitle'>Principal Investigators</div>
            <div class='projectTeamRow'>
              <a href='https://music.ucsc.edu/people/dard-neuman'>
                Dard Neuman
              </a>
            </div>
            <div class='projectTeamRow'>
              <a href='https://music.ucsc.edu/people/jonathan-myers'>
                Jon Myers
              </a>
            </div>
          </div>
        </div>
      </div>
  </div>
</template>

<script lang='ts'>

// This proposal is to support the next stage in the “interactive digital transcription platform” (IDTP) project, a transdisciplinary project that bridges computational media, linguistics, statistics, history, folklore, religious studies, ethnomusicology, and music composition. The IDTP is a National Endowment for the Humanities, Office of Digital Humanities (NEH-ODH) funded web-based application developed by principal investigator Dard Neuman and postdoctoral scholar and UCSC alumnus Jon Myers. The IDTP is a paradigm shifting tool in the arts and humanities that enables the digital transcription, archiving, sharing, and analysis of audio recordings of “non-western” melodic-semantic and melodic non- semantic traditions. The platform is already operational1 with a user interface and analysis suite built to enable and make available digital transcriptions for scholars and students who have musical, archival, linguistic, and/or literary research skills but are not trained in programming or computational techniques or methodologies. Specifically, this proposal involves the following advancements to make the project team highly competitive for center-level proposals: 1) researching phonetic and musical sound productions from multiple languages and traditions to broaden the transcription and synthesis syntax; 2) transcribing two hundred hours of recordings to apply Music Information Retrieval (MIR) and Machine Learning (ML) techniques to automate, as much as possible, this transcription process. The ultimate aim is to establish a new Center at UCSC for the Computational and Heuristic Analysis of Sound, Music, and the Social [CHASMS]. We have recently submitted a grant to the National Endowment for the Humanities’ Institutes for Advanced Topics in the Digital Humanities program, which, if funded, would allow us to convene a series of conferences in 2024 to train scholars, practitioners, and students in the
// IDTP. We envision CHASMS as a cutting edge research engine for “non-STEM” disciplines in support of faculty, graduate, and undergraduate research. CHASMS integrates humanistic and creative work with computational, statistical, and technical fluencies through a dynamic digital archive and corresponding open-source research platform that enables scholarly research, and innovative sonic artworks. These inter and intra-disciplinary interventions move “music” to a broader domain of humanistic and scientific inquiry that diversify and make more rigorous music-based inquiry. Though some musicologists and ethnomusicologists have, since the 1950s, argued against the utilization of staff notation for the transcription and analysis of non-European art music traditions,2 most music researchers continue to use it. This presents problems that are ethical, empirical, and epistemological. Ethically, staff notation imposes a Eurocentric representational understanding of musical form. Empirically, staff notation flattens out important aspects of many oral-melodic idioms, such as the nuanced glissando curves between pitches found in expressive cultures across the globe. Epistemologically, humanities scholars outside the disciplines of music have limited knowledge of staff notation, let alone other methodological tools to analyze melodic and rhythmic sound. This effectively removes a central part of everyday life from humanistic and social scientific inquiry, the relationship of organized sound to affective/sound communities (e.g., the social connections of the church bells, call to prayers, national anthems, etc.). These relationships are even more elusive in oral cultures and their secular and spiritual expressive traditions.
// By contrast, the IDTP pushes beyond Eurocentric frames and representational forms. Specifically, the IDTP provides a multi-layered and interactive platform and corresponding store of knowledge, allowing users to transcribe melodic sound intuitively, efficiently, and accurately from uploaded recordings; test the accuracy of their transcription through synthesized audio playback; and analyze the transcriptions quantitatively and computationally. The IDTP is able to represent melodic contours at a high degree of accuracy due to its fundamental rethinking of a foundational, widely held music-
// 1 The beta version of the IDTP is available at https://swara.studio.
// 2 Charles Seeger, ‘Toward a Universal Music Sound-Writing for Musicology’, Journal of the International Folk Music Council, 9 (1957), 63-6; Nicholas M. England, et al., ‘Symposium on Transcription and Analysis: A Hukwe Song with Musical Bow’, Ethnomusicology 8/3 (1964), 223–277; Mantle Hood, The Ethnomusicologist (New York, 1971); Ter Ellingson, ‘Transcription’, Ethnomusicology: An Introduction, ed. Helen Myers (Basingstoke, 1992) 153- 164.
//   1

// theoretical tenet: namely, that the fixed-pitch note in a twelve tone equal-tempered scale is the basic unit of structure for music making, transcription, notation, and analysis. The IDTP is organized around a different epistemic paradigm–a relationally dynamic and flexible tuning system and a succession of “trajectories”. Trajectories formally specified archetypal paths or curves from one pitch to another, or among a series of pitches, that correspond to the finely calibrated glissandi (continuous melodic contours across and between pitches) that appear in so many musical traditions outside of the European and U.S. keyboard and staff oriented paradigms of “art” musics. These include, but are not limited to African American field hollers, Islamic calls to prayers, Qawwali songs of Sufism, folk traditions of Vietnam, and court music of Central Java.3 This expansion of the representational and analytical capacity of melodic transcription, in turn, opens myriad recorded sound collections and archives to both digital preservation as well as quantitative and interpretive analysis, equipping a global network of scholars across disciplines to apply twenty-first century computational methodologies and large datasets toward humanistic inquiries on what are called, variously, affective, emotional, or listening communities.
// We believe that this expansion of the scholarly academic musical toolset away from a stratified reliance on the methodologies and technologies built to serve European art traditions will engender and lead to the success of a community of researchers from a more diverse array of backgrounds than have traditionally found success in these fields. Analytically, the dual roles of music transcription and the empirical analysis of music, once distinctive methodological features in the fields of musicology and ethnomusicology, are currently in a state of flux. The musicological turn4 in U.S. music departments in the 1980s and ’90s decentered the role of music theory and other empirical approaches in favor of critical and cultural theoretical approaches. There have been two broad correctives to this situation: the creation of custom notation systems, and the abandonment of transcription and empirical methods altogether. These solutions, however, raise additional challenges. Custom transcription methods don’t provide commensurate fields of data for quantitative and/or computational analysis, let alone a common language for researchers to engage a broader community of scholars and musicians with melodic sound analysis. Moreover, there has been resistance in U.S. humanities and arts disciplines, outside of a few programs and a small core of computer-science-literate researchers, to developing the kinds of empirical research programs that technological advances in other fields (music information retrieval (MIR), machine- learning (ML), etc.) have enabled. Put simply, graduate students in the arts and humanities are generally not trained in computational methodologies as part of their coursework,5 limiting the professionalization of future researchers. The methodological turn away from transcription-based research more broadly and empirical analysis more specifically moves the domain of melodic/rhythmic sound analysis away from quantitatively measurable evidence-based research, as well as cutting edge computational technologies based on digital audio research. This effectively removes a central part of everyday life from humanistic inquiry: the interconnected relationship between melodic expressive traditions and affective and emotional communities.6
// The IDTP and CHASMS are organized to address these challenges. Rather than view critical theory and empirical/computational methods as orthogonal approaches to research, CHASMS integrates
// 3 There are a number of traditions that culturally distinguish melodic verse or recitation from music (or what translates to english as music). This proposal refers to melodic traditions as well as musical traditions to make clear that it includes such expressive traditions.
// 4 Susan Mclary, Feminine Endings: Music, Gender, and Sexuality (Minneapolis: Univ. Minn. Press, 1991). Joseph Kerman, Contemplating Music: Challenges to Musicology (Cambridge, MA: Harvard University Press, 1985). Lydia Goehr, The Imaginary Museum of Musical Works: An Essay in the Philosophy of Music (Oxford: Clarendon Press, 1992). Marcia Citron, Gender and the Musical Canon (Cambrdige: Cambridge University Press, 1993).
// 5 Stephen Cottrell, “Big Music Data, Musicology, and the Study of Recorded Music: Three Case Studies,”
// The Musical Quarterly 101, no. 2-3 (2019): 216-243. 6
//  Gandhi, Leela. Affective Communities: Anticolonial Thought, Fin-de-siècle Radicalism, and the Politics
//  of Friendship. Duke University Press, 2006.
//  2

// them to advance fields in the arts and humanities, helping to professionalize the next generation of researchers and music makers by diversifying and making more inclusive the language and practice of sound studies, musicology, music theory and analysis. CHASMS will also be well-positioned to ensure the success and retention of students, faculty, and researchers from underrepresented groups: a foundational imperative for the development of the IDTP and ultimately for CHASMS as well, is a decentering of the ubiquitous system of western staff notation in favor of a more flexible, accurate, open system of musical representation (the IDTP).
// The seed funding attached to this proposal would fund a year of research from April 1, 2024 - March 31, 2025, during which time a number of important milestones will be achieved. Most importantly, we will organize and carry out five video, audio, and ultrasound recording sessions in the UCSC Electronic Music Studio with virtuoso vocalist musicians from a variety of musical traditions to study connections between and ask novel questions about musical style, technique, phonetics, and phonology. These data-collection events will provide us with important materials to enrich our endeavors in the development of audio-synthesis algorithms, machine-learning approaches to auto-transcription, and in understanding the organological/phonological particularities of sound traditions and their related spoken languages. This funding will also allow us to carry out a large-scale project of transcribing ~200 hours of musical recordings, an amount of time we have targeted in collaboration with our colleague/advisor David Kant, who works in voice and sound AI at Meta Inc., as an appropriate amount of data with which to train an auto-transcription transformer model. Additionally, this funding will also allow us to build a variety of important enhancements to the IDTP, such as synthesis engines for bowed-string, reed, wind, hammered, and percussion instruments and a full suite of analysis and visualization tools.
// Unlike some of areas of research undertaken at UCSC, in the arts and humanities, large, “center- scale” sources of funding are few and far between, and as such, in order to fund CHASMS, we envision a piecemeal approach in seeking out a variety of funding sources, from government grants, to foundation grants, to developing relationships with individual charitable donors, building on the work and relationships already established by PI Neuman as chair of the Classical Indian Music Endowment and Co-creator / Co-director of the Center for South Asian Studies. In terms of federal grants, there are a number of opportunities we have identified that our research group is in a strong position to win. One of these is the National Endowment for the Humanities’ Digital Humanities Advancement Grant, Level III, which funds projects up to $350,000. (Our research is currently being funded by a NEH Digital Humanities Advancement Grant level II grant: it is common for projects to continue on to level III after completing level II). We are also well suited to apply to a number of other NEH programs, including Dangers and Opportunities of Technology: Perspectives from the Humanities (<$150,000), Institutes for Advanced Topics in the Digital Humanities7 (<$250,000), Humanities Collections and Reference Resources (<$350,000), and Humanities Initiatives at Hispanic-Serving Institutions (<$150,000).
// Finally, developing the Center for CHASMS at UCSC builds on the institutional legacy of the UCSC Music department with its two unique doctoral programs: the cross-cultural musicology doctoral program was one of the first of its kind in the United States that did not separate musicology (“western” music) and ethnomusicology (“non-western” music); the doctor of musical arts program in composition integrated two distinctive tracks in algorithmic and world music compositions. Both the longer-term interdisciplinary and intercultural collaborations between faculty and doctoral students, as well as the more recent decolonial and anti-racist commitments of the Music department uniquely position the campus the lead the cross cultural, computational, and anti-racist research projects that the proposed Center for CHASMS fosters: the collaboration between PI Neuman and Postdoctoral scholar Myers was a product of these intersecting fields. Indeed, the Center for CHASMS is committed to the national need expressed across music disciplines to decolonize its fields with anti-racist policy, projects, and institutional commitments with rigorous research methodologies and technologies.
// 7 In February, 2023, we submitted a proposal for this grant, and will be notified in August, 2023.
//        3


import nehURL from '@/assets/logos/NEH_logo.jpg';
import ariURL from '@/assets/logos/ARI_logo.png';
import orURL from '@/assets/logos/OR_logo.png';
import eURL from '@/assets/logos/Endowment_logo.png';
import chasmsURL from '@/assets/logos/chasms_logo.png';

export default {
  name: 'LandingPage',
  data() {
    return {
      logos: {
        neh: nehURL,
        ari: ariURL,
        or: orURL,
        e: eURL,
        chasms: chasmsURL
      },
      layerColors: [
        '#50945c'
      ],
      subtitleText: "An Interactive Digital Transcription Platform (IDTP) that enables \
        transcription, archiving, sharing, and analysis of audio recordings of \
        oral melodic and improvisation traditions, with a first focus on \
        Hindustani music.",
      info: [
        {
          heading: 'Musical Transcription',
          text: 'Intuitive and flexible transcription tools and notation \
            system designed to better represent the finely calibrated \
            glissandi (continuous melodic contours across and between pitches) \
            that appear in many musical traditions outside of the European and \
            U.S. keyboard and staff oriented paradigms of music.'
        },
        {
          heading: 'Theoretical Identity',
          text: 'The IDTP is organized around a succession of “trajectories”: \
            formally specified, flexible basic units of musical continuity \
            that follow archetypal paths or curves from one pitch to another, \
            or among a series of pitches. Trajectories can be marked and \
            expressed with a variety of instrument-specific articulations, \
            allowing transcriptions to capture the performance practices of \
            specific traditions / idioms.'
        },
        {
          heading: 'Synthesis',
          text: 'The IDTP Editor includes custom synthesis engines associated \
            with each supported instrument, allowing the user to aurally \
            verify the accuracy of their transcription as measured up against \
            the original recording.'
        },
        {
          heading: 'Analysis',
          text: 'The IDTP includes a suite of analysis tools that allow users \
            to analyze their transcriptions quantitatively and \
            computationally, at a large scale across a range of performances \
            (diachronically or synchronically), or at a small scale through \
            specific measurements within a single performance, or even a \
            single phrase.'
        }
      ]
    }
  },
  methods: {
    goToLogin() {
      this.$router.push('/logIn');
    }
  }
}
</script>

<style scoped>
.titleBox {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  
}

.outer {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: top;
  background-color: #10abb6;

}

.logosBox {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
}

.logoImg {
  height: 150px;
  margin: 10px;
}

.logoImgBox {
  height: 150px;
  width: 500px;
  background-color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.titleRow {
  background-color: #50945c;
  /* min-height: 250px; */
  /* max-height: 600px; */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: top;
  color: white;
  width: 100%;
  max-width: 100%;
}

.title {
  /* min-width: 200px; */
  height: 70px;
  width: calc(100% - 160px);
  display: flex;
  align-items: center;
  justify-content: left;
  text-align: left;
  font-size: 30px;
  font-weight: bold;
}

.subtitle {
  /* min-width: 200px; */
  /* max-width: 950px; */
  width: calc(100% - 160px);
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: left;
  text-align: left;
  font-size: 20px;
}
.buttonRow {
  width: calc(100% - 160px);
  height: 70px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left;
}




.buttonRow > div {
  width: 100px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #b58500;
  color: white;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
  transition: color 0.3s ease;
  margin-right: 10px;
}

.buttonRow > div:hover {
  background-color: #F9E0A9;
  color: black;
}

/* .infoRowOuter {
  width: 100%;
  min-height: 320px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  background-color: #F9E0A9;
  color: black;
} */

.infoRowInner {
  /* width: 950px; */
  width: calc(100% - 160px);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  color: #242660;
  background-color: #F9E0A9;
  padding-left: 80px;
  padding-right: 80px;
}

.infoItem {
  /* width: 230px; */
  /* min-width: 230px; */
  height: 260px;
  flex: 1 0 20%;
  margin: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: top;
}

@media (max-width: 800px) {
  .infoItem {
    flex: 1 0 40%
  }
  
  .sponsorsRow > img {
    flex: 1 0 40%;
  }
}

@media (max-width: 400px) {
  .infoItem {
    flex: 1 0 80%;
  }
}

.infoItemHeading {
  font-size: 20px;
  font-weight: bold;
  text-align: left;
}

.infoItemText {
  font-size: 13px;
  width: 250px;
  max-height: 250px;
  text-align: justify;
}

.outer {
  font: 15px/1.5 "Helvetica Neue", Helvetica, Arial, sans-serif;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: top;
  overflow: auto;
}

.sponsorsRow {
  background-color: white;
  width: calc(100% - 160px);
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-evenly;
  flex-wrap: wrap;
}

.sponsorsRowOuter {
  background-color: white;
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
}

.sponsorsRow > div > img {
  width: 230px;
}

.sponsorsRow > div {
  height: 150px;
  width: 250px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.bottomRowInner {
  background-color: #10abb6;
  min-height: 260px;
  width: calc(100% - 160px);
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: left;
}

.bottomRow {
  background-color: #10abb6;
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
}

.chasmsBox > img {
  width: 170px;
  height: 170px;
  margin-right: 40px;
}

.chasmsBox {
  width: 250px;
  height: 170px;

}

.support {
  width: 180px;
  height: 170px;
  display: flex;
  flex-direction: column;
  align-items: left;
  justify-content: top;
  color: white;
}

.supportTitle {
  font-size: 22px;
  text-align: left;
}

.supportRow {
  width: 100%;
  text-align: left;
}

.projectTeam {
  color: white;
  width: 250px;
  height: 170px;
  display: flex;
  flex-direction: column;
  align-items: left;
  justify-content: top;
}

.projectTeamTitle {
  font-size: 22px;
  text-align: left;
}

.projectTeamRow {
  width: 100%;
  text-align: left;
}
</style>
