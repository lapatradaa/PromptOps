import './homepage.css'

export default function Home() {
  return (
    <div>
      <header>
        <div className='iconContainer'>
          <img src="/images/promptops_icon.svg"></img>
          <p>PromptOps</p>
        </div>
        <div className='signIn-signUp-Container'>
          <button className='signUp'>SIGN UP</button>
          <button className='signIn'>SIGN IN</button>
        </div>
      </header>
      <main>
        <div className='descContainer'>
          <p>Optimizes & Tests prompts for LLM with <span>PromptOps</span></p>
          <button className='startButton'>Get Start &gt;</button>
        </div>
        {/* <div className='illustrationContainer'> */}
          <img src='/images/illustration1.svg'></img>
        {/* </div> */}
      </main>
      <footer></footer>
    </div>
  )
}
